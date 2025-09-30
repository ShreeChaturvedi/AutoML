// Absolute minimal test - no dependencies except React
export default function AppMinimal() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      backgroundColor: '#1e293b',
      color: 'white',
      fontFamily: 'system-ui'
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
        React is Working! ✓
      </h1>
      <p style={{ fontSize: '24px' }}>
        If you see this, React is rendering correctly.
      </p>
      <p style={{ fontSize: '18px', marginTop: '40px', color: '#94a3b8' }}>
        The issue is with one of the application components.
      </p>
    </div>
  );
}