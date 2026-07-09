import React from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="layout" style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main
        className="main-content"
        style={{
          flex: 1,
          padding: 24,
          overflowY: 'auto',
          minWidth: 0,
        }}
      >
        {children}
      </main>
    </div>
  );
}
