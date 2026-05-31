import { useState, type FormEvent } from 'react';
import { createNotification } from '../api/notifications';
import type { NotificationAudience, NotificationSeverity } from '../types';

const ROLE_OPTIONS = ['Staff', 'Manager'];

export default function CreateNotificationPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<NotificationAudience>('all');
  const [severity, setSeverity] = useState<NotificationSeverity>('normal');
  const [roles, setRoles] = useState<string[]>(ROLE_OPTIONS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function toggleRole(role: string) {
    setRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await createNotification({
        title,
        content,
        audience,
        severity,
        roles: audience === 'roles' ? roles : undefined,
      });
      setTitle('');
      setContent('');
      setAudience('all');
      setSeverity('normal');
      setRoles(ROLE_OPTIONS);
      setMessage('Đã gửi thông báo.');
    } catch {
      setMessage('Không thể gửi thông báo. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="h-full overflow-auto bg-gray-950 px-6 py-6 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-semibold">Tạo thông báo</h1>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-gray-300">
            Tiêu đề
            <input
              className="mt-1 h-10 w-full rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-white outline-none focus:border-green-500"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={200}
            />
          </label>

          <label className="block text-sm font-medium text-gray-300">
            Nội dung
            <textarea
              className="mt-1 min-h-36 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <fieldset className="rounded-md border border-gray-800 p-4">
              <legend className="px-1 text-sm font-medium text-gray-300">Đối tượng nhận</legend>
              <div className="mt-2 grid gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    name="audience"
                    checked={audience === 'all'}
                    onChange={() => setAudience('all')}
                  />
                  All Staff/Manager
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    name="audience"
                    checked={audience === 'roles'}
                    onChange={() => setAudience('roles')}
                  />
                  Theo nhóm
                </label>
              </div>
              {audience === 'roles' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((role) => (
                    <label
                      key={role}
                      className="flex h-9 items-center gap-2 rounded-md border border-gray-700 px-3 text-sm text-gray-300"
                    >
                      <input
                        type="checkbox"
                        checked={roles.includes(role)}
                        onChange={() => toggleRole(role)}
                      />
                      {role}
                    </label>
                  ))}
                </div>
              ) : null}
            </fieldset>

            <fieldset className="rounded-md border border-gray-800 p-4">
              <legend className="px-1 text-sm font-medium text-gray-300">Mức độ</legend>
              <div className="mt-2 grid gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    name="severity"
                    checked={severity === 'normal'}
                    onChange={() => setSeverity('normal')}
                  />
                  Bình thường
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    name="severity"
                    checked={severity === 'urgent'}
                    onChange={() => setSeverity('urgent')}
                  />
                  Khẩn cấp
                </label>
              </div>
            </fieldset>
          </div>

          {message ? (
            <p className="rounded-md bg-gray-900 px-3 py-2 text-sm text-gray-300">{message}</p>
          ) : null}

          <button
            type="submit"
            disabled={saving || (audience === 'roles' && roles.length === 0)}
            className="h-10 rounded-md bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Đang gửi...' : 'Gửi thông báo'}
          </button>
        </form>
      </div>
    </section>
  );
}
