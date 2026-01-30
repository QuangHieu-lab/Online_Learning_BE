import prisma from '../utils/prisma.js';
import { uploadFileToFirebase, deleteFileFromFirebase, getFileUrl } from '../services/firebase-storage.service.js';

export const uploadVideo = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, description } = req.body;
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

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

export const getVideo = async (req, res) => {
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

export const streamVideo = async (req, res) => {
  try {
    const { videoId } = req.params;

    const videoPost = await prisma.videoPost.findUnique({
      where: { id: videoId },
    });

    if (!videoPost) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.redirect(videoPost.videoUrl);
  } catch (error) {
    console.error('Stream video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadVideo = async (req, res) => {
  try {
    const { videoId } = req.params;

    const videoPost = await prisma.videoPost.findUnique({
      where: { id: videoId },
    });

    if (!videoPost) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const downloadUrl = videoPost.videoUrl.replace('?alt=media', '?alt=media&download=true');
    res.redirect(downloadUrl);
  } catch (error) {
    console.error('Download video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;
    const userRole = req.userRoles?.[0];

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
            userId: true,
          },
        },
      },
    });

    if (!videoPost) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const isAdmin = userRole === 'admin';
    const isInstructor = videoPost.lesson.course.instructorId === userId;
    const isOwner = videoPost.userId === userId;

    if (!isAdmin && !isInstructor && !isOwner) {
      return res.status(403).json({ error: 'Not authorized to delete this video' });
    }

    try {
      const urlParts = videoPost.videoUrl.split('/o/');
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
        await deleteFileFromFirebase(filePath);
      }
    } catch (fileError) {
      console.error('Error deleting video file from Firebase:', fileError);
    }

    await prisma.videoPost.delete({
      where: { id: videoId },
    });

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
