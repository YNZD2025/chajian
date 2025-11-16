# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains two separate implementations of a mini user context system:

1. **Go Implementation** (`jhinih_minicontext/`) - A Go package implementing thread-safe user context management
2. **React Implementation** (`Mini-Context/`) - A React application demonstrating React Context API usage

## Development Commands

### React Project (`Mini-Context/`)
```bash
# Development server
npm run dev

# Build production bundle
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Go Project (`jhinih_minicontext/`)
```bash
# Run tests
go test

# Run demo application
go run ./cmd/demo

# Build the demo
go build ./cmd/demo

# Run specific test files
go test -run TestUserContext
go test -run TestLoginHandler
go test -run TestProfileHandler
```

## Architecture Overview

### Go Implementation (`jhinih_minicontext/`)

The Go implementation provides a thread-safe user context system with the following components:

- **`context.go`** - Core `UserContext` struct with thread-safe user management using `sync.RWMutex`
- **`login.go`** - `LoginHandler` for authentication logic and user session management
- **`profile.go`** - `ProfileHandler` for user profile operations and welcome messages
- **`errors.go`** - Custom error definitions (`ErrInvalidCredentials`, `ErrUserNotLoggedIn`, `ErrContextNotFound`)
- **`cmd/demo/main.go`** - Complete demonstration of the context system workflow

Key design patterns:
- Thread-safe operations with read-write mutex
- Context-aware design integrating with Go's `context.Context`
- Handler-based architecture for separation of concerns
- Copy-on-read pattern to prevent external modification

### React Implementation (`Mini-Context/`)

The React implementation demonstrates React Context API usage with:

- **`src/context/UserContext.js`** - React context creation using `React.createContext()`
- **`src/context/UserContextProvider.jsx`** - Context provider with useState for user state management
- **`src/Components/Login.jsx`** - Login component with form handling and API integration
- **`src/Components/Profile.jsx`** - Profile component for displaying user information
- **`src/App.jsx`** - Main app component wrapping children with UserContextProvider

Key patterns:
- React Context API for state sharing across components
- Custom hooks pattern with `useContext`
- Async form handling with loading and error states
- API integration structure (references `authApi` from config)

## Testing

### Go Tests
The Go implementation includes comprehensive tests:
- `context_test.go` - Tests core UserContext functionality
- `login_test.go` - Tests LoginHandler authentication flows
- `profile_test.go` - Tests ProfileHandler operations

Run all tests: `go test`
Run with verbose output: `go test -v`

### React Testing
No test files are currently present in the React implementation. Tests would typically be added using the project's testing framework (Jest/React Testing Library).

## File Structure Notes

- The Go module is named `jhinih_minicontext` with no external dependencies
- The React project uses Vite as the build tool with ESLint configuration
- Both implementations share the same conceptual model but use different paradigms (imperative Go vs declarative React)
- The Go version provides thread safety guarantees while React version relies on React's built-in state management

## Development Guidelines

- When working with the Go implementation, ensure thread safety is maintained
- For React development, follow the existing Context API patterns
- Both implementations focus on simplicity and educational demonstration rather than production-ready features
- The Go demo (`cmd/demo/main.go`) serves as both documentation and testing for the complete workflow