// Main App Component - Spatial Foraging Research Study (NetLogo Adaptation)
// Phase Flow: Landing -> Instructions -> Maze Training -> Foraging Rounds -> Completion

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Session, Round, MovementSample, GameEvent } from './types/schema';
import type { Condition } from './config/constants';
import { N_ROUNDS, CANVAS_SIZE, N_REWARDS, HIT_RADIUS, TIME_LIMIT } from './config/constants';
import { 
  createSession, 
  updateSession, 
  deleteSession,
  getSessionByParticipant,
  getMovementsForSession,
  getMovementsForRound,
  getEventsForSession,
  getEventsForRound,
  getRoundsForSession,
  getParticipantProfile,
  saveParticipantProfile
} from './utils/database';
import { 
  cloudCreateSession, 
  cloudUpdateSession,
  cloudSaveRound,
  cloudSaveMovementBatch,
  cloudSaveEventBatch
} from './utils/cloudDatabase';
import { assignCondition } from './utils/conditionGenerator';

import { Landing, type ParticipantInfo } from './components/Landing';
import { Instructions } from './components/Instructions';
import { MazeCanvas } from './components/MazeCanvas';
import { ForagingCanvas } from './components/ForagingCanvas';
import { RoundTransition } from './components/RoundTransition';
import { Completion } from './components/Completion';
import { AdminLogin, AdminDashboard, SessionDetail } from './components/Admin';
import { Modal } from './components/Modal';

import './App.css';

type Screen = 
  | 'landing'
  | 'instructions'
  | 'maze_training'
  | 'foraging'
  | 'round_transition'
  | 'completion'
  | 'admin_login'
  | 'admin_dashboard'
  | 'admin_session_detail';

function App() {
  // Core state
  const [screen, setScreen] = useState<Screen>('landing');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [condition, setCondition] = useState<Condition | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [_mazeCompleted, setMazeCompleted] = useState(false);
  
  // Session data
  const [completedRounds, setCompletedRounds] = useState<Round[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [allMovements, setAllMovements] = useState<MovementSample[]>([]);
  const [allEvents, setAllEvents] = useState<GameEvent[]>([]);
  
  // Modal state
  const [showPreForagingModal, setShowPreForagingModal] = useState(false);
  const [showEndLevelModal, setShowEndLevelModal] = useState(false);
  const [lastRoundScore, setLastRoundScore] = useState(0);
  
  // Admin state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Check admin auth on mount
  useEffect(() => {
    if (window.location.pathname === '/admin') {
      const isAuth = sessionStorage.getItem('admin_auth') === 'true';
      setScreen(isAuth ? 'admin_dashboard' : 'admin_login');
    }
  }, []);

  // Handle participant start with profile info
  const handleParticipantStart = useCallback(async (info: ParticipantInfo) => {
    const { fullName, age, gender, participantKey } = info;
    setParticipantId(participantKey);

    // Check for existing profile (condition persists per participantKey)
    let profile = await getParticipantProfile(participantKey);
    let assignedCondition: Condition;

    if (profile) {
      // Use existing condition
      assignedCondition = profile.assignedCondition;
    } else {
      // New participant - assign condition and save profile
      assignedCondition = assignCondition();
      profile = {
        participantKey,
        fullName,
        age,
        gender,
        assignedCondition,
        createdAt: new Date().toISOString()
      };
      await saveParticipantProfile(profile);
    }

    setCondition(assignedCondition);

    // Check for existing session with this participantKey
    const existingSession = await getSessionByParticipant(participantKey);
    
    if (existingSession && existingSession.status === 'complete') {
      // Completed session - show completion screen
      setSessionId(existingSession.sessionId);
      setSession(existingSession);
      setMazeCompleted(existingSession.mazeCompleted ?? true);
      
      const rounds = await getRoundsForSession(existingSession.sessionId);
      const movements = await getMovementsForSession(existingSession.sessionId);
      const events = await getEventsForSession(existingSession.sessionId);
      setCompletedRounds(rounds);
      setCurrentRound(rounds.length);
      setAllMovements(movements);
      setAllEvents(events);
      setScreen('completion');
    } else {
      // Either no session or incomplete session - start fresh
      if (existingSession) {
        await deleteSession(existingSession.sessionId);
      }
      
      // Create new session
      const newSessionId = uuidv4();
      
      const newSession: Session = {
        sessionId: newSessionId,
        participantId: participantKey,
        condition: assignedCondition,
        startTimestamp: new Date().toISOString(),
        roundsCompleted: 0,
        mazeCompleted: false,
        status: 'in_progress',
        consentTimestamp: new Date().toISOString(),
        config: {
          canvasSize: CANVAS_SIZE,
          nRewards: N_REWARDS,
          hitRadius: HIT_RADIUS,
          timeLimitMs: TIME_LIMIT,
          nRounds: N_ROUNDS
        },
        fullName,
        age,
        gender
      };

      await createSession(newSession);
      
      // Sync to cloud
      cloudCreateSession(newSession).then(success => {
        if (success) {
          console.log('[App] ✅ Session synced to cloud');
        } else {
          console.warn('[App] ⚠️ Failed to sync session to cloud');
        }
      });
      
      setSessionId(newSessionId);
      setSession(newSession);
      setCurrentRound(0);
      setMazeCompleted(false);
      setCompletedRounds([]);
      setScreen('instructions');
    }
  }, []);

  // Handle instructions complete -> go to maze training
  const handleInstructionsComplete = useCallback(() => {
    setScreen('maze_training');
  }, []);

  // Handle maze training complete -> show pre-foraging modal
  const handleMazeComplete = useCallback(async () => {
    setMazeCompleted(true);
    
    // Update session
    if (sessionId) {
      await updateSession(sessionId, { mazeCompleted: true });
      cloudUpdateSession(sessionId, { mazeCompleted: true });
    }
    
    // Show pre-foraging instruction modal
    setShowPreForagingModal(true);
  }, [sessionId]);

  // Handle pre-foraging modal OK -> start foraging
  const handlePreForagingOk = useCallback(() => {
    setShowPreForagingModal(false);
    setScreen('foraging');
  }, []);

  // Handle modal Halt -> exit to landing
  const handleModalHalt = useCallback(() => {
    setShowPreForagingModal(false);
    setShowEndLevelModal(false);
    // Reset all state and go to landing
    setParticipantId(null);
    setSessionId(null);
    setCondition(null);
    setCurrentRound(0);
    setMazeCompleted(false);
    setCompletedRounds([]);
    setSession(null);
    setAllMovements([]);
    setAllEvents([]);
    setScreen('landing');
  }, []);

  // Handle round complete - show end level modal
  const handleRoundComplete = useCallback(async (round: Round) => {
    const newRounds = [...completedRounds, round];
    setCompletedRounds(newRounds);
    setLastRoundScore(round.rewardsCollected);

    if (sessionId) {
      await updateSession(sessionId, {
        roundsCompleted: newRounds.length
      });
      
      // Sync round to cloud
      cloudSaveRound(round).then(ok => console.log('[App] Round sync:', ok ? '✅' : '❌'));
      cloudUpdateSession(sessionId, { roundsCompleted: newRounds.length });
      
      // Sync movements and events for this round
      const roundMovements = await getMovementsForRound(sessionId, round.roundIndex);
      const roundEvents = await getEventsForRound(sessionId, round.roundIndex);
      console.log(`[App] Round ${round.roundIndex} - Movements: ${roundMovements.length}, Events: ${roundEvents.length}`);
      
      if (roundMovements.length > 0) {
        cloudSaveMovementBatch(roundMovements).then(ok => 
          console.log(`[App] Round ${round.roundIndex} movements sync:`, ok ? '✅' : '❌')
        );
      }
      if (roundEvents.length > 0) {
        cloudSaveEventBatch(roundEvents).then(ok => 
          console.log(`[App] Round ${round.roundIndex} events sync:`, ok ? '✅' : '❌')
        );
      }
    }

    // Check if more rounds - show end level modal
    if (newRounds.length < N_ROUNDS) {
      setShowEndLevelModal(true);
    } else {
      // All rounds complete
      if (sessionId) {
        const endTime = new Date().toISOString();
        await updateSession(sessionId, {
          status: 'complete',
          endTimestamp: endTime
        });

        const movements = await getMovementsForSession(sessionId);
        const events = await getEventsForSession(sessionId);
        setAllMovements(movements);
        setAllEvents(events);
        
        // Sync to cloud
        console.log('[App] Syncing complete session to cloud...');
        cloudUpdateSession(sessionId, { status: 'complete', endTimestamp: endTime })
          .then(ok => console.log('[App] Session update:', ok ? '✅' : '❌'));
        cloudSaveMovementBatch(movements)
          .then(ok => console.log('[App] Movements sync:', ok ? '✅' : '❌'));
        cloudSaveEventBatch(events)
          .then(ok => console.log('[App] Events sync:', ok ? '✅' : '❌'));
        
        setSession(prev => prev ? { ...prev, status: 'complete', endTimestamp: endTime } : null);
      }
      setScreen('completion');
    }
  }, [completedRounds, sessionId]);

  // Handle end level modal OK -> continue to next round
  const handleEndLevelOk = useCallback(() => {
    setShowEndLevelModal(false);
    setCurrentRound(completedRounds.length);
    setScreen('foraging');
  }, [completedRounds.length]);

  // Handle continue after round transition
  const handleContinue = useCallback(() => {
    if (completedRounds.length >= N_ROUNDS) {
      setScreen('completion');
    } else {
      setCurrentRound(completedRounds.length);
      setScreen('foraging');
    }
  }, [completedRounds.length]);

  // Handle finish study
  const handleFinish = useCallback(() => {
    setParticipantId(null);
    setSessionId(null);
    setCondition(null);
    setCurrentRound(0);
    setMazeCompleted(false);
    setCompletedRounds([]);
    setSession(null);
    setAllMovements([]);
    setAllEvents([]);
    setScreen('landing');
  }, []);

  // Admin handlers
  const handleAdminLogin = useCallback(() => {
    setScreen('admin_dashboard');
  }, []);

  const handleAdminLogout = useCallback(() => {
    setScreen('admin_login');
    window.history.pushState({}, '', '/');
    setScreen('landing');
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    setSelectedSessionId(id);
    setScreen('admin_session_detail');
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setSelectedSessionId(null);
    setScreen('admin_dashboard');
  }, []);

  const handleBackToStudy = useCallback(() => {
    window.history.pushState({}, '', '/');
    setScreen('landing');
  }, []);

  // Render current screen
  const renderScreen = () => {
    switch (screen) {
      case 'landing':
        return <Landing onStart={handleParticipantStart} />;

      case 'instructions':
        return condition && participantId ? (
          <Instructions
            participantId={participantId}
            condition={condition}
            onStart={handleInstructionsComplete}
          />
        ) : null;

      case 'maze_training':
        return sessionId && participantId ? (
          <MazeCanvas
            sessionId={sessionId}
            participantId={participantId}
            onComplete={handleMazeComplete}
          />
        ) : null;

      case 'foraging':
        return sessionId && participantId && condition ? (
          <ForagingCanvas
            sessionId={sessionId}
            participantId={participantId}
            condition={condition}
            roundIndex={currentRound}
            onRoundComplete={handleRoundComplete}
          />
        ) : null;

      case 'round_transition':
        return completedRounds.length > 0 ? (
          <RoundTransition
            completedRound={completedRounds[completedRounds.length - 1]}
            nextRoundIndex={completedRounds.length}
            isLastRound={completedRounds.length >= N_ROUNDS}
            onContinue={handleContinue}
          />
        ) : null;

      case 'completion':
        return session ? (
          <Completion
            session={session}
            rounds={completedRounds}
            movements={allMovements}
            events={allEvents}
            onFinish={handleFinish}
          />
        ) : null;

      case 'admin_login':
        return <AdminLogin onLogin={handleAdminLogin} onBack={handleBackToStudy} />;

      case 'admin_dashboard':
        return (
          <AdminDashboard
            onSelectSession={handleSelectSession}
            onLogout={handleAdminLogout}
          />
        );

      case 'admin_session_detail':
        return selectedSessionId ? (
          <SessionDetail
            sessionId={selectedSessionId}
            onBack={handleBackToDashboard}
          />
        ) : null;

      default:
        return null;
    }
  };

  // Calculate trials left for end level modal
  const trialsLeft = N_ROUNDS - completedRounds.length;

  return (
    <div className="app">
      {renderScreen()}
      
      {/* Pre-Foraging Instruction Modal */}
      <Modal
        isOpen={showPreForagingModal}
        icon="info"
        onOk={handlePreForagingOk}
        onHalt={handleModalHalt}
        okText="OK"
        haltText="Quit"
      >
        <p>
          Now, using the same keys to move around, collect hidden resources. 
          Resources will appear in blue when you move over them. Your score is 
          visible in the yellow box outside the search area. Move around and try 
          to collect as much as you can in the time allowed. This task will repeat 
          five times. See if you can improve your score each time.
        </p>
      </Modal>

      {/* End of Level Feedback Modal */}
      <Modal
        isOpen={showEndLevelModal}
        icon="success"
        onOk={handleEndLevelOk}
        onHalt={handleModalHalt}
        okText="OK"
        haltText="Quit"
      >
        <p>Level completed.</p>
        <p><strong>Your score was: {lastRoundScore}</strong></p>
        <p>You have {trialsLeft} trial(s) left in this task.</p>
        <p>Press 'OK' to continue.</p>
      </Modal>
    </div>
  );
}

export default App;
