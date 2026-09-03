/**
 * Admin User Management Component
 * Tax Support AI - Egyptian Real Estate Tax Authority
 * Enterprise-grade User & Credentials Management
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Building2, 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  KeyRound, 
  Edit3, 
  Trash2,
  RefreshCw, 
  User, 
  Clock,
  Check,
  X,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Copy,
  Activity,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { UserProfile, UserRole, UserAccountStatus } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { apiFetch } from '../../lib/api-client.ts';

export const AdminUsers: React.FC = () => {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [passwordFilter, setPasswordFilter] = useState<string>('all');
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [sync35Loading, setSync35Loading] = useState<boolean>(false);

  const currentAdminName = userProfile?.displayName || 'مصطفى عدلي';
  const currentAdminUid = userProfile?.uid || 'usr_mostafa';

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<UserProfile | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState<UserProfile | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<UserProfile | null>(null);
  const [showResetLinkResult, setShowResetLinkResult] = useState<{ link: string; email: string } | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState<boolean>(false);

  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState<boolean>(false);

  // Create User Form State
  const [createForm, setCreateForm] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: 'مأمورية الضرائب العقارية بالقاهرة',
    jobTitle: 'مأمور فحص وربط ضريبي',
    role: 'employee' as UserRole,
    status: 'active' as UserAccountStatus
  });
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [showCreateConfirmPass, setShowCreateConfirmPass] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Profile Form State
  const [editForm, setEditForm] = useState({
    uid: '',
    displayName: '',
    username: '',
    jobTitle: '',
    department: '',
    role: 'employee' as UserRole,
    status: 'active' as UserAccountStatus
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Password Reset State
  const [resetPasswords, setResetPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showResetPass, setShowResetPass] = useState(false);
  const [showResetConfirmPass, setShowResetConfirmPass] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // General Notification
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await apiFetch<{ users: UserProfile[] }>('/api/admin/users');
      if (data?.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiagnostics = async () => {
    setDiagnosticsLoading(true);
    try {
      const { data } = await apiFetch('/api/admin/users/diagnostics');
      if (data) {
        setDiagnostics(data);
      }
    } catch (err) {
      console.error('Failed to load diagnostics:', err);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDiagnostics();
  }, []);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setActionError(null);
    setTimeout(() => setActionSuccess(null), 5000);
  };

  const showErrorNotification = (msg: string) => {
    setActionError(msg);
    setActionSuccess(null);
    setTimeout(() => setActionError(null), 6000);
  };

  // Sync / Verify 35 Real Employee Accounts
  const handleSync35Employees = async () => {
    setSync35Loading(true);
    try {
      const { data, ok, error } = await apiFetch<{
        success: boolean;
        message?: string;
        summary?: { total: number; active: number; mustChangePassword: number };
      }>('/api/auth/provision-employees', {
        method: 'POST'
      });
      if (ok && data?.success) {
        showNotification(`تم تأكيد وتهيئة ${data.summary?.total || 35} حساب موظف بنجاح (مع فرض تغيير كلمة المرور)`);
        await fetchUsers();
        await fetchDiagnostics();
      } else {
        showErrorNotification(error || 'فشل تهيئة حسابات الموظفين الـ 35');
      }
    } catch (err: any) {
      showErrorNotification(err.message || 'خطأ غير متوقع أثناء تهيئة الحسابات');
    } finally {
      setSync35Loading(false);
    }
  };

  // Selection toggle
  const toggleSelectUser = (uid: string) => {
    const next = new Set(selectedUids);
    if (next.has(uid)) {
      next.delete(uid);
    } else {
      next.add(uid);
    }
    setSelectedUids(next);
  };

  const toggleSelectAll = () => {
    const selectable = filteredUsers.filter(u => u.username !== 'mostafa');
    if (selectedUids.size >= selectable.length && selectable.length > 0) {
      setSelectedUids(new Set());
    } else {
      setSelectedUids(new Set(selectable.map(u => u.uid)));
    }
  };

  // 1. Create User with double password verification
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // Client-side strict validations
    if (!createForm.displayName.trim()) {
      setCreateError('يرجى إدخال الاسم الكامل للموظف');
      return;
    }

    let cleanUsername = (createForm.username || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (!cleanUsername) {
      cleanUsername = 'emp_' + Math.random().toString(36).substring(2, 8);
    }

    if (createForm.password.length < 6) {
      setCreateError('كلمة المرور يجب أن لا تقل عن 6 أحرف');
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      setCreateError('كلمتا المرور غير متطابقتين. يرجى التأكد من كتابتهما بدقة.');
      return;
    }

    setCreateLoading(true);
    try {
      const payload = {
        ...createForm,
        username: cleanUsername,
        displayName: createForm.displayName.trim()
      };

      const { data, ok, error } = await apiFetch<{ user: UserProfile }>('/api/admin/users/create', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!ok) {
        throw new Error(error || 'فشل إنشاء المستخدم');
      }

      setShowCreateModal(false);
      setCreateForm({
        displayName: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        department: 'مأمورية الضرائب العقارية بالقاهرة',
        jobTitle: 'مأمور فحص وربط ضريبي',
        role: 'employee',
        status: 'active'
      });
      showNotification(`تم إنشاء وتفعيل حساب الموظف (${data?.user?.displayName || payload.displayName}) بنجاح`);
      fetchUsers();
      fetchDiagnostics();
    } catch (err: any) {
      setCreateError(err.message || 'خطأ في إنشاء الحساب');
    } finally {
      setCreateLoading(false);
    }
  };

  // 2. Open Edit Profile Modal
  const openEditModal = (user: UserProfile) => {
    setEditForm({
      uid: user.uid,
      displayName: user.displayName,
      username: user.username,
      jobTitle: user.jobTitle || 'مأمور ضرائب',
      department: user.department || 'مصلحة الضرائب العقارية',
      role: user.role,
      status: user.status
    });
    setEditError(null);
    setShowEditProfileModal(user);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setEditLoading(true);
    try {
      const { ok, error } = await apiFetch('/api/admin/users/update-profile', {
        method: 'POST',
        body: JSON.stringify(editForm)
      });
      if (!ok) {
        throw new Error(error || 'فشل تحديث بيانات الحساب');
      }
      setShowEditProfileModal(null);
      showNotification(`تم تحديث بيانات (${editForm.displayName}) بنجاح`);
      fetchUsers();
    } catch (err: any) {
      setEditError(err.message || 'خطأ في تحديث البيانات');
    } finally {
      setEditLoading(false);
    }
  };

  // 3. Quick Status Toggle
  const handleQuickStatusToggle = async (user: UserProfile, newStatus: UserAccountStatus) => {
    if (user.username === 'mostafa' && newStatus !== 'active') {
      showErrorNotification('لا يمكن تعليق أو تعطيل حساب مسؤول النظام الرئيسي (مصطفى عدلي).');
      return;
    }
    try {
      const { ok } = await apiFetch('/api/admin/users/update-profile', {
        method: 'POST',
        body: JSON.stringify({
          uid: user.uid,
          status: newStatus
        })
      });
      if (ok) {
        showNotification(newStatus === 'active' ? `تم تفعيل حساب (${user.displayName})` : `تم تعليق حساب (${user.displayName})`);
        fetchUsers();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // 4. Admin Reset Password with Confirmation Check
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetPasswordModal) return;
    setResetError(null);

    if (resetPasswords.newPassword.length < 6) {
      setResetError('كلمة المرور الجديدة يجب أن لا تقل عن 6 أحرف');
      return;
    }
    if (resetPasswords.newPassword !== resetPasswords.confirmPassword) {
      setResetError('كلمتا المرور غير متطابقتين. يرجى إعادة كتابة التأكيد بدقة.');
      return;
    }

    setResetLoading(true);
    try {
      const { ok, error } = await apiFetch('/api/admin/users/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          uid: showResetPasswordModal.uid,
          newPassword: resetPasswords.newPassword,
          confirmPassword: resetPasswords.confirmPassword
        })
      });
      if (!ok) {
        throw new Error(error || 'فشل إعادة تعيين كلمة المرور');
      }
      setShowResetPasswordModal(null);
      setResetPasswords({ newPassword: '', confirmPassword: '' });
      showNotification(`تم تغيير كلمة المرور للموظف (${showResetPasswordModal.displayName}) بنجاح. أصبحت كلمة المرور الجديدة فعالة فوراً.`);
    } catch (err: any) {
      setResetError(err.message || 'خطأ في إعادة تعيين كلمة المرور');
    } finally {
      setResetLoading(false);
    }
  };

  // 5. Generate Password Reset Link
  const handleSendResetLink = async (user: UserProfile) => {
    try {
      const { data, ok, error } = await apiFetch<{ resetLink?: string }>('/api/admin/users/send-reset-link', {
        method: 'POST',
        body: JSON.stringify({ uid: user.uid })
      });
      if (ok && data?.resetLink) {
        setShowResetLinkResult({
          link: data.resetLink.startsWith('http') ? data.resetLink : window.location.origin + data.resetLink,
          email: user.email
        });
        showNotification(`تم إصدار رابط إعادة التعيين للموظف: ${user.displayName}`);
      } else {
        showErrorNotification(error || 'فشل إصدار الرابط');
      }
    } catch (err: any) {
      showErrorNotification(err.message || 'خطأ في إصدار الرابط');
    }
  };

  // 6. Delete Single User with instant optimistic UI update
  const handleDeleteUser = async () => {
    if (!showDeleteModal) return;
    const targetUser = showDeleteModal;
    setDeleteLoading(true);

    // Optimistic UI update
    setUsers(prev => prev.filter(u => u.uid !== targetUser.uid));
    setSelectedUids(prev => {
      const next = new Set(prev);
      next.delete(targetUser.uid);
      return next;
    });

    try {
      const { ok, error } = await apiFetch('/api/admin/users/delete', {
        method: 'POST',
        body: JSON.stringify({
          uid: targetUser.uid,
          username: targetUser.username
        })
      });
      if (!ok) {
        throw new Error(error || 'فشل الحذف');
      }
      setShowDeleteModal(null);
      showNotification(`تم حذف حساب (${targetUser.displayName}) بنجاح`);
      fetchDiagnostics();
    } catch (err: any) {
      showErrorNotification(err.message || 'خطأ أثناء الحذف');
      fetchUsers(); // Revert on failure
    } finally {
      setDeleteLoading(false);
    }
  };

  // 7. Batch Delete Selected Users
  const handleBatchDelete = async () => {
    if (selectedUids.size === 0) return;
    const uidsToDelete = Array.from(selectedUids);
    setBatchDeleteLoading(true);

    // Optimistic UI update
    setUsers(prev => prev.filter(u => !selectedUids.has(u.uid)));
    setSelectedUids(new Set());

    try {
      const { data, ok, error } = await apiFetch<{ deletedCount?: number }>('/api/admin/users/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ uids: uidsToDelete })
      });
      if (!ok) throw new Error(error || 'فشل الحذف الجماعي');
      showNotification(`تم حذف ${data?.deletedCount || uidsToDelete.length} حساب بنجاح`);
      fetchDiagnostics();
    } catch (err: any) {
      showErrorNotification(err.message || 'خطأ أثناء الحذف الجماعي');
      fetchUsers();
    } finally {
      setBatchDeleteLoading(false);
    }
  };

  // 8. Clear All Non-Primary Demo Accounts
  const handleClearAllEmployees = async () => {
    setBatchDeleteLoading(true);
    try {
      const { data, ok, error } = await apiFetch<{ message?: string }>('/api/admin/users/clear-employees', {
        method: 'POST'
      });
      if (!ok) throw new Error(error || 'فشل تنظيف الحسابات');
      setShowClearConfirmModal(false);
      setSelectedUids(new Set());
      showNotification(data?.message || 'تم حذف جميع الحسابات التجريبية بنجاح');
      fetchUsers();
      fetchDiagnostics();
    } catch (err: any) {
      showErrorNotification(err.message || 'خطأ أثناء تنظيف الحسابات');
    } finally {
      setBatchDeleteLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (providerFilter === 'google' && u.provider !== 'google') return false;
    if (providerFilter === 'password' && u.provider === 'google') return false;
    if (passwordFilter === 'must_change' && !u.mustChangePassword) return false;
    if (passwordFilter === 'updated' && u.mustChangePassword) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.displayName?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.uid?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q) ||
      u.jobTitle?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Toast Notification (Success) */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toast Notification (Error) */}
      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
            <Users className="w-5 h-5 text-emerald-700" />
            <span>إدارة حسابات الموظفين والصلاحيات (Authentication & RBAC)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة شاملة لهوية الموظفين ومستودع بيانات الاعتماد المنفصل، حذف وتعديل الحسابات وتغيير كلمات المرور مع التحقق الثنائي
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleSync35Employees}
            disabled={sync35Loading || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-60"
            title="تأكيد ومزامنة الـ 35 حساب موظف الرسميين وتفعيل متطلبات الأمان"
          >
            <ShieldCheck className={`w-3.5 h-3.5 text-emerald-600 ${sync35Loading ? 'animate-spin' : ''}`} />
            <span>{sync35Loading ? 'جاري التحقق...' : 'تهيئة وتأكيد 35 موظف'}</span>
          </button>
          <button
            onClick={() => setShowClearConfirmModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            title="حذف جميع الحسابات التجريبية والإبقاء على حسابك الرئيسي فقط"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>تنظيف الحسابات التجريبية</span>
          </button>
          <button
            onClick={() => { fetchUsers(); fetchDiagnostics(); }}
            disabled={loading || diagnosticsLoading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ إنشاء حساب موظف</span>
          </button>
        </div>
      </div>

      {/* Real-time Diagnostics Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">إجمالي الحسابات</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{users.length}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-emerald-600">المستخدمين النشطين</div>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">
              {users.filter(u => u.status === 'active').length}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-amber-600">تغيير كلمة المرور إلزامي</div>
            <div className="text-xl font-bold text-amber-700 mt-0.5">
              {users.filter(u => u.mustChangePassword).length}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-blue-600">تسجيلات Google</div>
            <div className="text-xl font-bold text-blue-700 mt-0.5">
              {users.filter(u => u.provider === 'google').length}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-indigo-600">المدراء والمشرفون</div>
            <div className="text-xl font-bold text-indigo-700 mt-0.5">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <KeyRound className="w-4 h-4" />
          </div>
        </div>
      </div>


      {/* Batch Actions Bar (When items selected) */}
      {selectedUids.size > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-rose-900 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>تم تحديد {selectedUids.size} حساب/موظف</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedUids(new Set())}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
            >
              إلغاء التحديد
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={batchDeleteLoading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{batchDeleteLoading ? 'جاري الحذف...' : `حذف الحسابات المحددة (${selectedUids.size})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex-1 w-full relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث بالاسم، اسم المستخدم، البريد، المسمى الوظيفي أو الإدارة..."
            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({users.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              النشطين ({users.filter(u => u.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === 'suspended' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              المعلقين ({users.filter(u => u.status === 'suspended').length})
            </button>
          </div>

          {/* Password Change Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setPasswordFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                passwordFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كل كلمات المرور
            </button>
            <button
              onClick={() => setPasswordFilter('must_change')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                passwordFilter === 'must_change' ? 'bg-amber-100 text-amber-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مطلوب تغييرها ({users.filter(u => u.mustChangePassword).length})
            </button>
            <button
              onClick={() => setPasswordFilter('updated')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                passwordFilter === 'updated' ? 'bg-emerald-100 text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مُحدّثة ({users.filter(u => !u.mustChangePassword).length})
            </button>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                roleFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              جميع الأدوار
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                roleFilter === 'admin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              إدارة (Admin)
            </button>
            <button
              onClick={() => setRoleFilter('employee')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                roleFilter === 'employee' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              موظف (Employee)
            </button>
          </div>

          {/* Provider Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setProviderFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                providerFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كافة المزوّدين
            </button>
            <button
              onClick={() => setProviderFilter('google')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                providerFilter === 'google' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Google Auth
            </button>
            <button
              onClick={() => setProviderFilter('password')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                providerFilter === 'password' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كلمة مرور / نظام
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={
                      selectedUids.size > 0 &&
                      selectedUids.size >= filteredUsers.filter(u => u.username !== 'mostafa').length &&
                      filteredUsers.filter(u => u.username !== 'mostafa').length > 0
                    }
                    className="w-4 h-4 rounded-md text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    title="تحديد الكل"
                  />
                </th>
                <th className="py-3.5 px-4">الموظف</th>
                <th className="py-3.5 px-4">المسمى الوظيفي</th>
                <th className="py-3.5 px-4">الإدارة / المأمورية</th>
                <th className="py-3.5 px-4">الدور والصلاحية</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4">آخر تسجيل دخول</th>
                <th className="py-3.5 px-4 text-center">إجراءات الأمان والتحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>جاري تحميل بيانات الموظفين...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    لا توجد حسابات مطابقة للبحث أو الفلتر المختار
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isMostafa = user.username === 'mostafa' || user.uid === 'usr_mostafa';
                  const isSelected = selectedUids.has(user.uid);
                  return (
                    <tr 
                      key={user.uid} 
                      className={`transition-colors ${
                        isSelected ? 'bg-rose-50/60' : isMostafa ? 'bg-indigo-50/20 hover:bg-indigo-50/40' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3.5 px-3 text-center">
                        {!isMostafa ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectUser(user.uid)}
                            className="w-4 h-4 rounded-md text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                        ) : (
                          <span className="text-slate-300 text-[10px]" title="حساب محمي">🔒</span>
                        )}
                      </td>

                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 text-white ${
                              user.role === 'admin' ? 'bg-gradient-to-br from-indigo-600 to-slate-900 shadow-xs' : 'bg-gradient-to-br from-emerald-600 to-teal-800'
                            }`}>
                              {user.displayName?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <span>{user.displayName}</span>
                              {isMostafa && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-md font-semibold">
                                  المدير الرئيسي
                                </span>
                              )}
                              {user.provider === 'google' ? (
                                <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded-md font-medium inline-flex items-center gap-1">
                                  <span>Google Auth</span>
                                </span>
                              ) : (
                                <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded-md font-medium inline-flex items-center gap-1">
                                  <span>كلمة مرور</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap">
                              <span>@{user.username}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400">{user.email}</span>
                              <span className="text-slate-300">•</span>
                              <span 
                                onClick={() => {
                                  navigator.clipboard.writeText(user.uid);
                                  showNotification(`تم نسخ المعرف: ${user.uid}`);
                                }}
                                className="text-[10px] text-slate-400 hover:text-emerald-700 cursor-pointer bg-slate-100 px-1 py-0.2 rounded"
                                title="اضغط لنسخ UID"
                              >
                                UID: {user.uid.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Job Title */}
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {user.jobTitle || 'موظف فحص ضريبي'}
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate">
                        {user.department || 'مصلحة الضرائب العقارية'}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-200 text-[10px] font-bold border border-indigo-800/50">
                            <ShieldCheck className="w-3 h-3 text-indigo-400" />
                            مدير نظام (Admin)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium">
                            <User className="w-3 h-3 text-slate-500" />
                            موظف (Employee)
                          </span>
                        )}
                      </td>

                      {/* Status & Password Status */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div>
                          {user.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              نشط ومفعّل
                            </span>
                          ) : user.status === 'suspended' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              معلق مؤقتاً
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              معطل
                            </span>
                          )}
                        </div>
                        {user.mustChangePassword ? (
                          <div className="text-[10px] text-amber-800 font-semibold inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                            <Lock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                            <span>مطلوب تغيير كلمة المرور</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                            <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            <span>كلمة المرور محدثة</span>
                          </div>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {user.lastLoginAt ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{new Date(user.lastLoginAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">لم يسجل بعد</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit Profile */}
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="تعديل البيانات والصلاحية"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setShowResetPasswordModal(user);
                              setResetPasswords({ newPassword: '', confirmPassword: '' });
                              setResetError(null);
                            }}
                            className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="إعادة تعيين كلمة المرور"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Generate Reset Link */}
                          <button
                            onClick={() => handleSendResetLink(user)}
                            className="p-1.5 text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                            title="إصدار رابط تعيين كلمة المرور للموظف"
                          >
                            <LinkIcon className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Suspend / Activate */}
                          {user.status === 'active' ? (
                            <button
                              onClick={() => handleQuickStatusToggle(user, 'suspended')}
                              disabled={isMostafa}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isMostafa ? 'text-slate-300 opacity-40 cursor-not-allowed' : 'text-amber-600 hover:bg-amber-50'
                              }`}
                              title={isMostafa ? 'حساب المسؤول الرئيسي محمي' : 'تعليق الحساب'}
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleQuickStatusToggle(user, 'active')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="تفعيل الحساب"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete User */}
                          {!isMostafa ? (
                            <button
                              onClick={() => setShowDeleteModal(user)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف هذا الحساب نهائياً"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="p-1.5 text-slate-300 cursor-not-allowed" title="حساب المدير الرئيسي محمي ضد الحذف">
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE USER (WITH DOUBLE PASSWORD & LIVE VERIFICATION) */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-700" />
                <span>إضافة حساب موظف جديد (Create Authenticated User)</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              {/* Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    value={createForm.displayName}
                    onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                    placeholder="مثال: يوسف خالد إبراهيم"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اسم المستخدم (Username) *</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    placeholder="youssef_khalid"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">البريد الإلكتروني الداخلي</label>
                <input
                  type="email"
                  dir="ltr"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder={createForm.username ? `${createForm.username}@taxsupport.internal` : "employee@taxsupport.internal"}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden font-mono"
                />
              </div>

              {/* Double Password Fields with Matching Status */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-700" />
                    بيانات الاعتماد وكلمة المرور
                  </span>
                  <span className="text-[10px] text-slate-500">6 أحرف كحد أدنى</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">كلمة المرور *</label>
                    <div className="relative">
                      <input
                        type={showCreatePass ? "text" : "password"}
                        required
                        dir="ltr"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl focus:border-emerald-600 focus:outline-hidden font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePass(!showCreatePass)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showCreatePass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">تأكيد كلمة المرور *</label>
                    <div className="relative">
                      <input
                        type={showCreateConfirmPass ? "text" : "password"}
                        required
                        dir="ltr"
                        value={createForm.confirmPassword}
                        onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                        className={`w-full pl-8 pr-3 py-2 bg-white border rounded-xl focus:outline-hidden font-mono ${
                          createForm.confirmPassword && createForm.password !== createForm.confirmPassword
                            ? 'border-rose-400 focus:border-rose-600'
                            : createForm.confirmPassword && createForm.password === createForm.confirmPassword
                            ? 'border-emerald-500 focus:border-emerald-600'
                            : 'border-slate-300 focus:border-emerald-600'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreateConfirmPass(!showCreateConfirmPass)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showCreateConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Match indicator pill */}
                {createForm.confirmPassword && (
                  <div className="pt-1">
                    {createForm.password === createForm.confirmPassword ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        كلمتا المرور متطابقتان تماماً
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                        <X className="w-3.5 h-3.5 text-rose-500" />
                        كلمتا المرور غير متطابقتين
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Department & Job Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">المسمى الوظيفي</label>
                  <input
                    type="text"
                    value={createForm.jobTitle}
                    onChange={(e) => setCreateForm({ ...createForm, jobTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الإدارة أو المأمورية</label>
                  <input
                    type="text"
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الدور والصلاحية</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden font-medium"
                  >
                    <option value="employee">موظف (استفسارات وبحث ضريبي)</option>
                    <option value="admin">مدير نظام (تحكم كامل + لوحة الإدارة)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">حالة الحساب</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as UserAccountStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden font-medium"
                  >
                    <option value="active">نشط ومفعّل فوراً</option>
                    <option value="suspended">معلق مؤقتاً</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createLoading || (createForm.password !== createForm.confirmPassword)}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? 'جاري التحقق والإنشاء...' : 'حفظ وإنشاء الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RESET PASSWORD (WITH DOUBLE PASSWORD & IMMEDIATE SYNC) */}
      {/* ========================================================================= */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <span>إعادة تعيين كلمة المرور للموظف</span>
              </h3>
              <button onClick={() => setShowResetPasswordModal(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl mb-4 text-indigo-950 flex items-center gap-2.5">
              <User className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <div className="font-bold">{showResetPasswordModal.displayName}</div>
                <div className="text-[11px] text-indigo-700 font-mono">@{showResetPasswordModal.username} ({showResetPasswordModal.email})</div>
              </div>
            </div>

            {resetError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">كلمة المرور الجديدة *</label>
                <div className="relative">
                  <input
                    type={showResetPass ? "text" : "password"}
                    required
                    dir="ltr"
                    value={resetPasswords.newPassword}
                    onChange={(e) => setResetPasswords({ ...resetPasswords, newPassword: e.target.value })}
                    placeholder="6 أحرف على الأقل"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPass(!showResetPass)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showResetPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">تأكيد كلمة المرور الجديدة *</label>
                <div className="relative">
                  <input
                    type={showResetConfirmPass ? "text" : "password"}
                    required
                    dir="ltr"
                    value={resetPasswords.confirmPassword}
                    onChange={(e) => setResetPasswords({ ...resetPasswords, confirmPassword: e.target.value })}
                    placeholder="أعد كتابة كلمة المرور"
                    className={`w-full pl-8 pr-3 py-2 bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden font-mono ${
                      resetPasswords.confirmPassword && resetPasswords.newPassword !== resetPasswords.confirmPassword
                        ? 'border-rose-400 focus:border-rose-600'
                        : resetPasswords.confirmPassword && resetPasswords.newPassword === resetPasswords.confirmPassword
                        ? 'border-emerald-500 focus:border-emerald-600'
                        : 'border-slate-300 focus:border-indigo-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmPass(!showResetConfirmPass)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showResetConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {resetPasswords.confirmPassword && (
                <div>
                  {resetPasswords.newPassword === resetPasswords.confirmPassword ? (
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      كلمتا المرور متطابقتان
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                      <X className="w-3.5 h-3.5 text-rose-500" />
                      كلمتا المرور غير متطابقتين
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={resetLoading || resetPasswords.newPassword.length < 6 || (resetPasswords.newPassword !== resetPasswords.confirmPassword)}
                  className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {resetLoading ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT USER PROFILE & ROLES */}
      {/* ========================================================================= */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-700" />
                <span>تعديل بيانات الحساب والصلاحيات</span>
              </h3>
              <button onClick={() => setShowEditProfileModal(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">المسمى الوظيفي</label>
                  <input
                    type="text"
                    value={editForm.jobTitle}
                    onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الإدارة / المأمورية</label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الدور والصلاحية</label>
                  <select
                    value={editForm.role}
                    disabled={editForm.username === 'mostafa'}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden font-medium disabled:opacity-60"
                  >
                    <option value="employee">موظف (Employee)</option>
                    <option value="admin">مدير نظام (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">حالة الحساب</label>
                  <select
                    value={editForm.status}
                    disabled={editForm.username === 'mostafa'}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as UserAccountStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden font-medium disabled:opacity-60"
                  >
                    <option value="active">نشط (Active)</option>
                    <option value="suspended">معلق (Suspended)</option>
                    <option value="disabled">معطل (Disabled)</option>
                  </select>
                </div>
              </div>

              {editForm.username === 'mostafa' && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  حساب المسؤول الرئيسي (mostafa) محمي بصلاحية دائمة ولا يمكن تعليقه أو تحويله لموظف عادي.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {editLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RESET LINK RESULT */}
      {/* ========================================================================= */}
      {showResetLinkResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-cyan-600" />
                <span>رابط إعادة تعيين كلمة المرور</span>
              </h3>
              <button onClick={() => setShowResetLinkResult(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 mb-3">
              تم إنشاء رابط تعيين مشفر للموظف: <strong className="text-slate-900">{showResetLinkResult.email}</strong>. يمكنك نسخ الرابط وإرساله له:
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] break-all select-all text-slate-800 mb-4">
              {showResetLinkResult.link}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(showResetLinkResult.link);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'تم النسخ للحافظة!' : 'نسخ الرابط'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowResetLinkResult(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-xl cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-xs space-y-4">
            <div className="flex items-center gap-3 text-rose-600 mb-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">تأكيد حذف الحساب نهائياً</h3>
                <p className="text-slate-500 text-[11px]">سيتم حذف وصول الموظف وبيانات دخوله فوراً</p>
              </div>
            </div>
            <p className="text-slate-700 leading-relaxed">
              هل أنت متأكد من حذف حساب <strong className="text-slate-900">"{showDeleteModal.displayName}"</strong> (اسم المستخدم: @{showDeleteModal.username})؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteUser}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg cursor-pointer"
              >
                {deleteLoading ? 'جاري الحذف...' : 'حذف الحساب نهائياً'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CLEAR ALL DEMO EMPLOYEES CONFIRMATION */}
      {/* ========================================================================= */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-xs space-y-4">
            <div className="flex items-center gap-3 text-rose-600 mb-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">حذف جميع الحسابات التجريبية</h3>
                <p className="text-slate-500 text-[11px]">تنظيف وإبقاء حساب مصطفى عدلي فقط</p>
              </div>
            </div>
            <p className="text-slate-700 leading-relaxed">
              هل تريد بالتأكيد حذف كافة الحسابات التجريبية للموظفين؟ سيبقى فقط حسابك كمسؤول رئيسي (<strong className="text-indigo-900">مصطفى عدلي</strong>).
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={batchDeleteLoading}
                onClick={handleClearAllEmployees}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg cursor-pointer"
              >
                {batchDeleteLoading ? 'جاري التنظيف...' : 'تأكيد تنظيف الحسابات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
