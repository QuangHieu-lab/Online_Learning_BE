import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { uploadFileToFirebase, deleteFileFromFirebase, getFileUrl } from '../services/firebase-storage.service';

export const uploadVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { title, description } = req.body;
    const userId = req.userId!;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Firebase Storage
    const uploadResult = await uploadFileToFirebase(req.file, 'videos', title ? `${title}-${Date.now()}` : undefined);
    const videoUrl = uploadResult.url;

    const videoPost = await prisma.videoPost.create({
      data: {
        lessonId,
        userId,
        videoUrl,
        title: title || req.file.originalname,
        description,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(videoPost);
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;

    const videoPost = await prisma.videoPost.findUnique({
      where: { id: videoId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        lesson: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!videoPost) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json(videoPost);
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const streamVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;

    const videoPost = await prisma.videoPost.findUnique({
      where: { id: videoId },
    });

    if (!videoPost) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Firebase Storage URLs are already publicly accessible
    // Just redirect to the Firebase Storage URL
    res.redirect(videoPost.videoUrl);
  } catch (error) {
    console.error('Stream video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;

    const videoPost = await prisma.videoPost.findUnique({
      where: { id: videoId },
    });

    if (!videoPost) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Firebase Storage URLs can be downloaded directly
    // Redirect to the Firebase Storage URL with download parameter
    const downloadUrl = videoPost.videoUrl.replace('?alt=media', '?alt=media&download=true');
    res.redirect(downloadUrl);
  } catch (error) {
    console.error('Download video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId!;
    const userRole = req.userRole;

    // Get video post with lesson and course info
    const videoPost = await prisma.videoPost.findUnique({
      where: { id: videoId },
      include: {
        lesson: {
          include: {
            course: true,
          },
        },
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!videoPost) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check authorization: Only admin, lecturer (instructor of the course), or video owner can delete
    const isAdmin = userRole === 'ADMIN';
    const isInstructor = videoPost.lesson.course.instructorId === userId;
    const isOwner = videoPost.userId === userId;

    if (!isAdmin && !isInstructor && !isOwner) {
      return res.status(403).json({ error: 'Not authorized to delete this video' });
    }

    // Delete from Firebase Storage
    // Extract file path from Firebase Storage URL
    try {
      const urlParts = videoPost.videoUrl.split('/o/');
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
        await deleteFileFromFirebase(filePath);
      }
    } catch (fileError) {
      console.error('Error deleting video file from Firebase:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await prisma.videoPost.delete({
      where: { id: videoId },
    });

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
