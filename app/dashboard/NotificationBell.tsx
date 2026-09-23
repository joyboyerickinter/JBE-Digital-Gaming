'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Notification = {
  id: string;
  order_id: string | null;
  order_number: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export default function NotificationBell({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('id,order_id,order_number,title,message,read_at,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (mounted) setNotifications((data ?? []) as Notification[]);
    }

    load();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications((current) => [payload.new as Notification, ...current].slice(0, 20));
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((current) =>
              current.map((item) => item.id === payload.new.id ? payload.new as Notification : item)
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications((current) => current.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  async function markRead(notification: Notification) {
    if (!notification.read_at) {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notification.id).eq('user_id', userId);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
    }
    if (notification.order_id) window.location.href = `/dashboard/orders/${notification.order_id}`;
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((item) => !item.read_at).map((item) => item.id);
    if (!unreadIds.length) return;

    const now = new Date().toISOString();
    await supabase.from('notifications').update({ read_at: now }).in('id', unreadIds).eq('user_id', userId);
    setNotifications((current) => current.map((item) => item.read_at ? item : { ...item, read_at: now }));
  }

  return (
    <div className="notificationWrap">
      <button
        type="button"
        className="notificationBtn"
        aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="notificationIcon">♢</span>
        {unreadCount > 0 && <span className="notificationCount">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notificationPanel">
          <div className="notificationPanelHead">
            <div><strong>Notifications</strong><span>{unreadCount} unread</span></div>
            <button type="button" onClick={markAllRead} disabled={!unreadCount}>Mark all read</button>
          </div>

          <div className="notificationList">
            {notifications.length ? notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notificationItem${item.read_at ? '' : ' notificationUnread'}`}
                onClick={() => markRead(item)}
              >
                <span className="notificationDot" />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.message}</small>
                  <em>{new Date(item.created_at).toLocaleString('en-GB')}</em>
                </span>
              </button>
            )) : (
              <div className="notificationEmpty">No notifications yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
