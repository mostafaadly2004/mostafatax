/**
 * Admin User Management API Routes
 * Enterprise-grade User & Credentials Management backed by Firebase Auth & Firestore.
 */

import { Router, Response } from 'express';
import { requireAdmin, AuthenticatedRequest } from '../../auth-middleware.ts';
import { 
  listAllUsers, 
  createNewUser, 
  updateUserProfile, 
  resetUserPassword, 
  generatePasswordResetLink, 
  deleteUser, 
  batchDeleteUsers 
} from '../../services/userService.ts';

const router = Router();

/**
 * GET /api/admin/users
 */
router.get('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await listAllUsers();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحميل قائمة الموظفين', details: err.message });
  }
});

/**
 * POST /api/admin/users/create
 */
router.post('/create', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const newUser = await createNewUser(req.body, actor);
    res.json({ success: true, user: newUser });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل إنشاء حساب الموظف' });
  }
});

/**
 * POST /api/admin/users/update-profile
 */
router.post('/update-profile', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const updated = await updateUserProfile(req.body, actor);
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل تحديث بيانات الموظف' });
  }
});

/**
 * POST /api/admin/users/reset-password
 */
router.post('/reset-password', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { uid, newPassword, confirmPassword } = req.body;
    await resetUserPassword(uid, newPassword, confirmPassword, actor);
    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل إعادة تعيين كلمة المرور' });
  }
});

/**
 * POST /api/admin/users/send-reset-link
 */
router.post('/send-reset-link', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { uid } = req.body;
    const resetLink = await generatePasswordResetLink(uid, actor);
    res.json({ success: true, resetLink });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل إصدار رابط استعادة كلمة المرور' });
  }
});

/**
 * POST /api/admin/users/delete
 */
router.post('/delete', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { uid } = req.body;
    await deleteUser(uid, actor);
    res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل حذف المستخدم' });
  }
});

/**
 * POST /api/admin/users/batch-delete
 */
router.post('/batch-delete', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { uids } = req.body;
    if (!Array.isArray(uids) || uids.length === 0) {
      res.status(400).json({ error: 'لم يتم تحديد أي حسابات للحذف' });
      return;
    }
    const count = await batchDeleteUsers(uids, actor);
    res.json({ success: true, deletedCount: count });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'فشل الحذف الجماعي' });
  }
});

/**
 * POST /api/admin/users/clear-employees
 */
router.post('/clear-employees', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;
    const allUsers = await listAllUsers();
    const employeeUids = allUsers
      .filter(u => u.role !== 'admin' && u.username !== 'mostafa')
      .map(u => u.uid);

    const count = await batchDeleteUsers(employeeUids, actor);
    res.json({ success: true, deletedCount: count });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تنظيف الحسابات التجريبية' });
  }
});

/**
 * GET /api/admin/users/diagnostics
 */
router.get('/diagnostics', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await listAllUsers();
    const activeCount = users.filter(u => u.status === 'active').length;
    const suspendedCount = users.filter(u => u.status === 'suspended').length;
    const adminCount = users.filter(u => u.role === 'admin').length;
    const employeeCount = users.filter(u => u.role === 'employee').length;

    res.json({
      totalUsers: users.length,
      activeUsers: activeCount,
      suspendedUsers: suspendedCount,
      adminUsers: adminCount,
      employeeUsers: employeeCount,
      authProvider: 'Firebase Authentication & Firestore RBAC',
      serverTimestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل استرجاع تشخيصات المستخدمين' });
  }
});

export default router;
