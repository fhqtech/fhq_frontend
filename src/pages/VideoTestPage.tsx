import { useState, useEffect } from 'react';

// Enhanced test page to display session data properly
export default function VideoTestPage() {
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sessionId = 'X173i42BORJC0uyWQZhT_e1c0e04e-c8fd-4d84-92ac-06a286a35525_1758900621558';

  useEffect(() => {
    const testAPI = async () => {
      try {
        console.log('Testing API call to session endpoint...');

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/videos/session/${sessionId}`);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data);
        setSessionData(data);

      } catch (err) {
        console.error('API Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    testAPI();
  }, [sessionId]);

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading session data...</div>
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#999' }}>
            Fetching data for session: {sessionId}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          padding: '15px',
          color: '#c33'
        }}>
          <h2 style={{ margin: '0 0 10px 0' }}>Error Loading Session Data</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', fontFamily: 'Arial, sans-serif', display: 'flex' }}>
      {/* Left Side - Conversation Transcript */}
      <div style={{
        width: '50%',
        backgroundColor: '#f8f9fa',
        borderRight: '2px solid #dee2e6',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #dee2e6',
          backgroundColor: '#ffffff'
        }}>
          <h2 style={{ margin: '0', color: '#0c5460' }}>Interview Transcript</h2>
          <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
            {sessionData?.conversation.length || 0} conversation turns
          </p>
        </div>

        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto'
        }}>
          {sessionData && sessionData.conversation.length > 0 ? (
            <div>
              {sessionData.conversation.map((turn, index) => (
                <div key={index} style={{
                  backgroundColor: 'white',
                  margin: '0 0 15px 0',
                  padding: '15px',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${turn.speaker === 'AI' ? '#007bff' : '#28a745'}`,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    color: turn.speaker === 'AI' ? '#007bff' : '#28a745',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{turn.speaker}</span>
                    <span style={{
                      fontSize: '12px',
                      color: '#6c757d',
                      fontWeight: 'normal'
                    }}>
                      {(turn.startTime / 1000).toFixed(1)}s - {(turn.endTime / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <div style={{ lineHeight: '1.5' }}>{turn.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#6c757d',
              padding: '40px 20px',
              fontStyle: 'italic'
            }}>
              {sessionData ? 'No conversation data available for this session' : 'Loading conversation...'}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Session Info & Video Player */}
      <div style={{
        width: '50%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff'
      }}>

        {/* Session Information Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #dee2e6',
          backgroundColor: '#f8f9fa'
        }}>
          <h1 style={{ margin: '0 0 10px 0', color: '#333' }}>Video Session</h1>
          {sessionData && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: '14px' }}>
              <div><strong>Candidate:</strong> {sessionData.candidate.name}</div>
              <div><strong>Interview:</strong> {sessionData.interview.title}</div>
              <div><strong>Duration:</strong> {(sessionData.video.duration / 1000).toFixed(1)}s</div>
              <div><strong>Status:</strong>
                <span style={{
                  backgroundColor: sessionData.candidate.status === 'completed' ? '#d4edda' : '#fff3cd',
                  color: sessionData.candidate.status === 'completed' ? '#155724' : '#856404',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  marginLeft: '8px',
                  fontSize: '12px'
                }}>
                  {sessionData.candidate.status}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Video Player Area */}
        <div style={{
          flex: 1,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Video Player Placeholder */}
          <div style={{
            backgroundColor: '#000',
            borderRadius: '8px',
            aspectRatio: '16/9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px'
          }}>
            {sessionData ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎥</div>
                <div>Video Player</div>
                <div style={{ fontSize: '14px', opacity: 0.7, marginTop: '5px' }}>
                  {sessionData.video.url}
                </div>
              </div>
            ) : (
              'Loading video...'
            )}
          </div>

          {/* Video Controls */}
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '15px'
          }}>
            <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>Video Controls</div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}>▶️ Play</button>
              <button style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}>⏸️ Pause</button>
              <div style={{ flex: 1, height: '4px', backgroundColor: '#dee2e6', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: '30%', backgroundColor: '#007bff', borderRadius: '2px' }}></div>
              </div>
              <span style={{ fontSize: '14px', color: '#6c757d' }}>
                {sessionData ? `${(sessionData.video.duration / 1000).toFixed(1)}s` : '0s'}
              </span>
            </div>
          </div>

          {/* Additional Info */}
          {sessionData && (
            <div style={{
              backgroundColor: '#e8f4fd',
              border: '1px solid #bee5eb',
              borderRadius: '8px',
              padding: '15px',
              fontSize: '14px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#0c5460' }}>Session Details</div>
              <div style={{ display: 'grid', gap: '4px' }}>
                <div><strong>Session ID:</strong> {sessionData.sessionId.substring(0, 20)}...</div>
                <div><strong>Interview Type:</strong> {sessionData.interview.type}</div>
                <div><strong>Email:</strong> {sessionData.candidate.email}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}