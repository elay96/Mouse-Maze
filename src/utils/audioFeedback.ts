// Audio Feedback for Reward Collection

import { REWARD_SOUND_FREQUENCY, REWARD_SOUND_DURATION, REWARD_SOUND_VOLUME } from '../config/constants';

let audioContext: AudioContext | null = null;

/**
 * Initialize or get the AudioContext
 */
function getAudioContext(): AudioContext | null {
  if (audioContext === null) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  return audioContext;
}

/**
 * Play reward collection sound
 */
export function playRewardSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  // Resume context if suspended (required by browser autoplay policies)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  
  try {
    // Create oscillator
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Configure oscillator
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(REWARD_SOUND_FREQUENCY, ctx.currentTime);
    
    // Configure gain (volume envelope)
    gainNode.gain.setValueAtTime(REWARD_SOUND_VOLUME, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + REWARD_SOUND_DURATION / 1000);
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Play
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + REWARD_SOUND_DURATION / 1000);
  } catch (e) {
    console.warn('Failed to play reward sound:', e);
  }
}

/**
 * Play a pleasant chime for reward (two-tone)
 */
export function playRewardChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  
  try {
    const now = ctx.currentTime;
    
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    gain1.gain.setValueAtTime(REWARD_SOUND_VOLUME * 0.8, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.1);
    
    // Second tone (higher, delayed)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now + 0.05); // E6
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(REWARD_SOUND_VOLUME * 0.6, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.2);
  } catch (e) {
    console.warn('Failed to play reward chime:', e);
  }
}

/**
 * Initialize audio context on user interaction (required by browsers)
 */
export function initAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

