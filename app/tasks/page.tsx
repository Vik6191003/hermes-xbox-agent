'use client';
import Link from 'next/link';
import { History, ArrowRight, Gamepad2 } from 'lucide-react';

const TASKS = [
  { id: 1, name: 'Mining Quest Grind', game: 'Unknown RPG', steps: 5, runs: 30, lastRun: '2 hours ago', status: 'done' },
  { id: 2, name: 'Cobalt Ore Farm', game: 'Fantasy RPG', steps: 4, runs: 50, lastRun: 'Yesterday', status: 'done' },
  { id: 3, name: 'Herb Gathering Circuit', game: 'Open World Game', steps: 6, runs: 20, lastRun: '3 days ago', status: 'done' },
];

export default function TasksPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #1a1a2e', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <History size={20} color="#00d4ff" />
          <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Task History</span>
        </div>
        <Link href="/" style={{ color: '#00d4ff', textDecoration: 'none', fontSize: 14 }}>← Dashboard</Link>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {TASKS.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#444' }}>
            <Gamepad2 size={48} style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 18 }}>No tasks yet</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>Upload a video to create your first automation plan.</p>
            <Link href="/upload" style={{ color: '#00d4ff', textDecoration: 'none', marginTop: 16, display: 'inline-block' }}>Go to Upload →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TASKS.map((task) => (
              <div key={task.id} style={{ background: '#0f0f1a', border: '1px solid #1a1a2e', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#fff', marginBottom: 4 }}>{task.name}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{task.game} · {task.steps} steps · {task.runs} runs · {task.lastRun}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: task.status === 'done' ? '#00ff8822' : '#ffaa0022', color: task.status === 'done' ? '#00ff88' : '#ffaa00' }}>
                    {task.status === 'done' ? '✓ Done' : 'Running'}
                  </span>
                  <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#00d4ff', textDecoration: 'none', fontSize: 13 }}>
                    Replay <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
