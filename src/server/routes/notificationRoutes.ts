import { Router } from 'express';
import { db } from '../../db/index.ts';
import { notifications } from '../../db/schema.ts';
import { requireAuth } from '../middleware.ts';
import { desc, eq } from 'drizzle-orm';

const router = Router();

// GET /api/notifications
router.get('/', requireAuth, async (_req, res): Promise<any> => {
  try {
    const list = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(30);

    const unreadCount = list.filter((n) => !n.isRead).length;

    return res.status(200).json({
      success: true,
      data: list,
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', requireAuth, async (req, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

  try {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
    return res.status(200).json({ success: true, message: 'Marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', requireAuth, async (_req, res): Promise<any> => {
  try {
    await db.update(notifications).set({ isRead: true });
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
  }
});

export default router;
