import React, { useState, useReducer, useEffect } from 'react';

/**
 * ==========================================
 * TYPES (THE CONTRACT)
 * ==========================================
 */

export interface UserState {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: 'Admin' | 'Member' | 'Guest';
    status: 'online' | 'offline' | 'away';
    bio: string;
    isLoading: boolean;
    lastUpdated?: number;
}

export type UserAction =
    | { type: 'UPDATE_BIO'; payload: string }
    | { type: 'TOGGLE_STATUS' }
    | { type: 'SAVE_START' }
    | { type: 'SAVE_SUCCESS'; payload: number }
    | { type: 'SAVE_ERROR'; error: string };

export type UserEffect =
    | { type: 'API_SAVE_BIO'; bio: string; userId: string }
    | { type: 'LOG_EVENT'; message: string }
    | { type: 'NOTIFY_SUCCESS'; message: string };

/**
 * ==========================================
 * FUNCTIONAL CORE (THE BRAIN)
 * ==========================================
 * Pure logic. No side effects. No React.
 * Transforms current state and action into next state and a plan of effects.
 */
export const ProfileLogic = {
    initialState: (user: Partial<UserState>): UserState => ({
        id: 'user-123',
        name: 'Michael Hartmayer',
        email: 'michael@example.com',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
        role: 'Admin',
        status: 'online',
        bio: 'Software Architect building the future of agentic coding.',
        isLoading: false,
        ...user,
    }),

    update(state: UserState, action: UserAction): { nextState: UserState; effects: UserEffect[] } {
        switch (action.type) {
            case 'UPDATE_BIO':
                return {
                    nextState: { ...state, bio: action.payload },
                    effects: [{ type: 'LOG_EVENT', message: `Bio changed to: ${action.payload}` }]
                };

            case 'TOGGLE_STATUS': {
                const nextStatus: UserState['status'] = state.status === 'online' ? 'away' : state.status === 'away' ? 'offline' : 'online';
                return {
                    nextState: { ...state, status: nextStatus },
                    effects: [{ type: 'LOG_EVENT', message: `Status toggled to: ${nextStatus}` }]
                };
            }

            case 'SAVE_START':
                return {
                    nextState: { ...state, isLoading: true },
                    effects: [{ type: 'API_SAVE_BIO', bio: state.bio, userId: state.id }]
                };

            case 'SAVE_SUCCESS':
                return {
                    nextState: { ...state, isLoading: false, lastUpdated: action.payload },
                    effects: [
                        { type: 'NOTIFY_SUCCESS', message: 'Profile saved successfully!' },
                        { type: 'LOG_EVENT', message: 'Profile saved to server.' }
                    ]
                };

            case 'SAVE_ERROR':
                return {
                    nextState: { ...state, isLoading: false },
                    effects: [{ type: 'LOG_EVENT', message: `Save failed: ${action.error}` }]
                };

            default:
                return { nextState: state, effects: [] };
        }
    }
};

/**
 * ==========================================
 * IMPERATIVE SHELL (THE COMPONENT)
 * ==========================================
 * React-specific. Handles state, events, and side effects.
 */
export const UserProfile: React.FC<{ initialUser?: Partial<UserState> }> = ({ initialUser }) => {
    const [state, setState] = useState(() => ProfileLogic.initialState(initialUser || {}));

    // The "Loop": Intercepts actions, runs them through the Core, then executes Effects
    const dispatch = (action: UserAction) => {
        const { nextState, effects } = ProfileLogic.update(state, action);
        setState(nextState);
        executeEffects(effects, dispatch);
    };

    // The Effect Executor (The Shell's dirty work)
    const executeEffects = async (effects: UserEffect[], dispatch: React.Dispatch<UserAction>) => {
        for (const effect of effects) {
            switch (effect.type) {
                case 'API_SAVE_BIO':
                    try {
                        // Simulate API call
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        dispatch({ type: 'SAVE_SUCCESS', payload: Date.now() });
                    } catch (e) {
                        dispatch({ type: 'SAVE_ERROR', error: 'Failed to connect' });
                    }
                    break;
                case 'LOG_EVENT':
                    console.log(`[ProfileLog]: ${effect.message}`);
                    break;
                case 'NOTIFY_SUCCESS':
                    alert(effect.message);
                    break;
            }
        }
    };

    return (
        <div className=\"profile-card\">
            < div className =\"profile-header\">
                < div className =\"avatar-container\">
                    < img src = { state.avatar } alt = { state.name } className =\"avatar\" />
                        < div className = {`status-indicator ${state.status}`
}></div >
        </div >
    <div className=\"header-info\">
        < h1 > { state.name }</h1 >
            <p className=\"email\">{state.email}</p>
                < span className =\"role-badge\">{state.role}</span>
        </div >
      </div >

    <div className=\"profile-body\">
        < label htmlFor =\"bio\">Professional Bio</label>
            < textarea
id =\"bio\"
value = { state.bio }
onChange = {(e) => dispatch({ type: 'UPDATE_BIO', payload: e.target.value })}
placeholder =\"Tell us about yourself...\"
    />

    <div className=\"actions\">
        < button
className =\"btn-secondary\" 
onClick = {() => dispatch({ type: 'TOGGLE_STATUS' })}
          >
    Change Status
          </button >
    <button
        className=\"btn-primary\" 
onClick = {() => dispatch({ type: 'SAVE_START' })}
disabled = { state.isLoading }
    >
    { state.isLoading ? 'Saving...' : 'Save Profile' }
          </button >
        </div >
      </div >

{
    state.lastUpdated && (
        <div className=\"profile-footer\">
          Last saved: { new Date(state.lastUpdated).toLocaleTimeString() }
        </div>
      )}

{/* STYLES (Injected for preview/self-containment) */ }
<style>{`
        .profile-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 32px;
          color: #fff;
          width: 400px;
          font-family: 'Inter', -apple-system, sans-serif;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          transition: transform 0.3s ease;
        }

        .profile-card:hover {
          transform: translateY(-5px);
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
        }

        .avatar-container {
          position: relative;
        }

        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .status-indicator {
          position: absolute;
          bottom: -4px;
          right: -4px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 3px solid rgba(0,0,0,0.5);
        }

        .status-indicator.online { background: #10b981; box-shadow: 0 0 10px #10b981; }
        .status-indicator.away { background: #f59e0b; }
        .status-indicator.offline { background: #6b7280; }

        .header-info h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .email {
          margin: 4px 0 8px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
        }

        .role-badge {
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .profile-body label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 8px;
          color: rgba(255, 255, 255, 0.4);
        }

        textarea {
          width: 100%;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px;
          color: #fff;
          font-size: 14px;
          resize: none;
          min-height: 100px;
          margin-bottom: 24px;
          transition: all 0.2s ease;
        }

        textarea:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }

        .actions {
          display: flex;
          gap: 12px;
        }

        .btn-primary, .btn-secondary {
          flex: 1;
          padding: 12px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .btn-primary {
          background: #6366f1;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #4f46e5;
          transform: scale(1.02);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .profile-footer {
          margin-top: 24px;
          font-size: 11px;
          text-align: center;
          color: rgba(255, 255, 255, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 16px;
        }
      `}</style>
    </div >
  );
};
