# Testing Documentation

## Overview

This project uses **Vitest** for unit testing and **React Testing Library** for component testing. All application logic and UI components have comprehensive test coverage.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

### Unit Tests

Located in `src/**/__tests__/` directories:

- **Utils Tests** (`src/utils/__tests__/`)
  - `arena.test.ts` - Arena calculation utilities
  - `fileIO.test.ts` - File save/load operations
  - `uuid.test.ts` - ID generation

- **Store Tests** (`src/stores/__tests__/`)
  - `drillStore.test.ts` - Drill state management
  - `editorStore.test.ts` - Editor state management
  - `animationStore.test.ts` - Animation state management

### Component Tests

Located in `src/components/**/__tests__/` directories:

- **UI Components** (`src/components/UI/__tests__/`)
  - `Layout.test.tsx` - Main layout structure
  - `Toolbar.test.tsx` - Top toolbar
  - `PropertiesPanel.test.tsx` - Right sidebar properties

- **Editor Components** (`src/components/Editor/__tests__/`)
  - `Editor.test.tsx` - Main editor component
  - `EditorToolbar.test.tsx` - Editor toolbar
  - `ArenaCanvas.test.tsx` - Arena canvas rendering
  - `HorseRenderer.test.tsx` - Horse rendering component

- **Filmstrip Components** (`src/components/Filmstrip/__tests__/`)
  - `Filmstrip.test.tsx` - Filmstrip container
  - `FrameControls.test.tsx` - Frame control buttons

- **Animation Components** (`src/components/Animation/__tests__/`)
  - `AnimationControls.test.tsx` - Animation playback controls

## Test Utilities

### Test Setup (`src/test/setup.ts`)
- Configures Jest DOM matchers
- Sets up cleanup after each test

### Test Utils (`src/test/testUtils.tsx`)
- Custom render function with providers
- Mocks for Konva components (canvas rendering)

## Test Coverage

### Utils (100%)
- ✅ Arena calculations
- ✅ File I/O operations
- ✅ UUID generation

### Stores (100%)
- ✅ Drill store (CRUD operations, frame management, horse management, sub-patterns)
- ✅ Editor store (selection, settings, view controls)
- ✅ Animation store (playback state, time control, speed, audio)

### Components
- ✅ All UI components
- ✅ All Editor components
- ✅ All Filmstrip components
- ✅ All Animation components

## Writing New Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../myModule';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });
});
```

### Component Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/testUtils';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Mocking

### Konva Components
Konva components are automatically mocked in `testUtils.tsx` to work in jsdom environment.

### File Operations
File I/O operations are mocked in component tests to avoid actual file system access.

### Store State
Stores are reset before each test to ensure isolation.

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Names**: Test names should clearly describe what they test
3. **Arrange-Act-Assert**: Structure tests with clear sections
4. **Mock External Dependencies**: Mock file system, canvas, etc.
5. **Test User Behavior**: Focus on what users see and do, not implementation details

## Continuous Integration

Tests should pass before merging:
- All unit tests pass
- All component tests pass
- No linting errors
- Coverage meets threshold (if configured)

