const prisma = require('../utils/prisma');
const {
  uploadFileToFirebase,
  deleteFileFromFirebase,
} = require('../services/firebase-storage.service');

// Video controller uses LessonResource model (resourceId = videoId in routes)
const uploadVideo = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, description } = req.body;
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const lessonIdInt = parseInt(lessonId);
    if (isNaN(lessonIdInt)) {
      return res.status(400).json({ error: 'Invalid lesson ID' });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { lessonId: lessonIdInt },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    if (lesson.module.course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const uploadResult = await uploadFileToFirebase(
      req.file,
      'videos',
      title ? `${title}-${Date.now()}` : undefined
    );
    const videoUrl = uploadResult.url;

    const lessonResource = await prisma.lessonResource.create({
      data: {
        lessonId: lessonIdInt,
        title: title || req.file.originalname,
        fileUrl: videoUrl,
        fileType: 'video',
      },
    });

    res.status(201).json({
      resourceId: lessonResource.resourceId,
      lessonId: lessonResource.lessonId,
      title: lessonResource.title,
      videoUrl: lessonResource.fileUrl,
      fileType: lessonResource.fileType,
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const resourceIdInt = parseInt(videoId);

    if (isNaN(resourceIdInt)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    const lessonResource = await prisma.lessonResource.findUnique({
      where: { resourceId: resourceIdInt },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!lessonResource || lessonResource.fileType !== 'video') {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      resourceId: lessonResource.resourceId,
      lessonId: lessonResource.lessonId,
      title: lessonResource.title,
      videoUrl: lessonResource.fileUrl,
      fileType: lessonResource.fileType,
      lesson: lessonResource.lesson,
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const streamVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const resourceIdInt = parseInt(videoId);

    if (isNaN(resourceIdInt)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    const lessonResource = await prisma.lessonResource.findUnique({
      where: { resourceId: resourceIdInt },
    });

    if (!lessonResource || lessonResource.fileType !== 'video') {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.redirect(lessonResource.fileUrl);
  } catch (error) {
    console.error('Stream video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const downloadVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const resourceIdInt = parseInt(videoId);

    if (isNaN(resourceIdInt)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    const lessonResource = await prisma.lessonResource.findUnique({
      where: { resourceId: resourceIdInt },
    });

    if (!lessonResource || lessonResource.fileType !== 'video') {
      return res.status(404).json({ error: 'Video not found' });
    }

    const downloadUrl = lessonResource.fileUrl.replace(
      '?alt=media',
      '?alt=media&download=true'
    );
    res.redirect(downloadUrl);
  } catch (error) {
    console.error('Download video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;
    const userRoles = req.userRoles || [];
    const resourceIdInt = parseInt(videoId);

    if (isNaN(resourceIdInt)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    const lessonResource = await prisma.lessonResource.findUnique({
      where: { resourceId: resourceIdInt },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!lessonResource || lessonResource.fileType !== 'video') {
      return res.status(404).json({ error: 'Video not found' });
    }

    const isAdmin = userRoles.includes('admin');
    const isInstructor =
      lessonResource.lesson.module.course.instructorId === userId;

    if (!isAdmin && !isInstructor) {
      return res.status(403).json({ error: 'Not authorized to delete this video' });
    }

    try {
      const urlParts = lessonResource.fileUrl.split('/o/');
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
        await deleteFileFromFirebase(filePath);
      }
    } catch (fileError) {
      console.error('Error deleting video file from Firebase:', fileError);
    }

    await prisma.lessonResource.delete({
      where: { resourceId: resourceIdInt },
    });

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  uploadVideo,
  getVideo,
  streamVideo,
  downloadVideo,
  deleteVideo,
};
