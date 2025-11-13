# Animation System Explanation

## How Animation is Supposed to Work

### 1. **Animation State Management**
- The `animationStore` manages the animation state: `'stopped'`, `'playing'`, or `'paused'`
- It tracks `currentTime` (in seconds) which represents the playback position
- The `useAnimation()` hook is called in `AnimationControls.tsx` to start the animation loop

### 2. **Animation Loop (`useAnimation` hook)**
When `animationState === 'playing'`:
- Starts a `requestAnimationFrame` loop that runs at ~60fps
- Each frame calculates the elapsed time since the last frame
- Updates `currentTime` in the store: `newTime = currentTime + deltaTime * playbackSpeed`
- Updates the `currentFrameIndex` based on which frame's time range contains `currentTime`

### 3. **Frame Structure**
Each frame has:
- `timestamp`: The start time of the frame (seconds from drill start)
- `duration`: How long this frame lasts (seconds until next frame starts)
- `horses`: Array of horses at this keyframe

Example:
- Frame 0: `timestamp = 0`, `duration = 5.0` (runs from 0s to 5s)
- Frame 1: `timestamp = 5.0`, `duration = 5.0` (runs from 5s to 10s)
- Frame 2: `timestamp = 10.0`, `duration = 5.0` (runs from 10s to 15s)

### 4. **Interpolation System**
When `animationState === 'playing'`:
- `ArenaCanvas` calls `getInterpolatedHorses(drill.frames, animationTime)`
- This function:
  1. Finds which frame contains the current time using `getFrameInterpolation()`
  2. Calculates `t` (0 to 1) representing progress through the current frame
  3. For each horse, interpolates between its position in the current frame and next frame
  4. Uses easing (`easeInOut`) for smooth acceleration/deceleration

### 5. **Rendering**
- During playback: Horses are rendered at interpolated positions
- When stopped/paused: Horses are rendered at exact frame positions

## Potential Issues to Check

1. **Is `useAnimation()` being called?**
   - Check: Is `AnimationControls` component mounted? (It should be in `Layout.tsx`)

2. **Is `animationState` actually 'playing'?**
   - Check: When you click play, does `animationStore.state` become `'playing'`?

3. **Is `currentTime` being updated?**
   - Check: Does `animationStore.currentTime` increase during playback?

4. **Are frame timestamps correct?**
   - Check: Do frames have proper `timestamp` values? First frame should be 0.

5. **Is interpolation being called?**
   - Check: In `ArenaCanvas.tsx` line 226, the condition requires:
     - `currentFrame` exists
     - `drill` exists
     - `animationState === 'playing'`
     - `drill.frames.length > 0`

6. **Is the condition too restrictive?**
   - ✅ FIXED: The condition was requiring `currentFrame` to exist, but interpolation doesn't actually need it - it uses the frames array directly. This has been fixed to use `useMemo` for better performance and clearer logic.

## Debugging Steps

1. Add console logs to verify:
   - `useAnimation` is running the loop
   - `currentTime` is updating
   - `getInterpolatedHorses` is being called
   - Frame interpolation is finding the correct frames

2. Check browser console for errors

3. Verify frame data structure is correct

