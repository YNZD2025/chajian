# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension called "一念职达助手" (Job Assistance Helper) that provides AI-powered form autofill functionality for job applications. The extension uses a two-stage AI architecture to analyze web forms and automatically fill them with user resume data.

## Extension Development

### Loading the Extension
To test/develop the extension:
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the extension directory
4. The extension will appear in the browser toolbar

### Environment Configuration
The project uses a unified configuration system through `config.js`:
- **Development**: Uses `localhost:3000` (web) and `localhost:8080` (API)
- **Production**: Configure actual URLs in `config.js` PRODUCTION section
- Switch environments by modifying `ENV` in `config.js` or using console commands:
  - `switchToDevelopment()` / `switchToProduction()`
  - `showCurrentConfig()`

### File Loading Order
The extension loads scripts in a specific order defined in `manifest.json`:
1. `config.js` - Environment configuration (MUST be first)
2. Utility modules (`js/autofill/utils/*`)
3. Core modules (`js/autofill/core/*`)
4. Services (`js/autofill/services/*`)
5. Main entry point (`js/autofill/AutoFillMain.js`)
6. Content script (`content.js`)

## Architecture

### Chrome Extension Components
- **Background Script** (`background.js`): Service worker handling extension lifecycle
- **Popup** (`popup.html/js`): Extension UI for login/settings
- **Content Script** (`content.js`): Injected into web pages for form detection/filling

### AI Autofill Engine
The autofill system uses a modular, two-stage AI architecture:

#### Stage 1: Page Analysis
- **AIService.analyzePage()**: Sends page HTML to AI backend
- Returns `sessionId` and structured form sections
- Handles graceful degradation if AI service fails

#### Stage 2: Form Filling
- **AIService.fillValues()**: Uses sessionId + resume data to generate fill values
- **ProgressiveFiller**: Handles actual DOM manipulation and form filling
- **FormExpander**: Automatically expands dynamic form sections

#### Core Modules
- **AutoFillMain**: Main entry point and orchestrator
- **FormFillController**: Central controller managing the fill process
- **FieldScanner**: Detects and analyzes form fields
- **AIService**: Two-stage AI communication layer
- **ProgressiveFiller**: Handles progressive form filling with retries
- **FormExpander**: Expands dynamic/hidden form sections

#### Utility Modules
- **DOMUtils**: DOM manipulation helpers
- **EventSimulator**: Simulates user interactions (clicks, typing)
- **FrameworkAdapter**: Handles different JS frameworks (React, Vue, etc.)
- **SelectMatcher**: Smart dropdown/select field matching
- **DatePickerHandler**: Specialized date input handling
- **Highlighter**: Visual feedback for form fields

### State Management
The filling process follows these states:
`idle` → `expanding` → `scanning` → `analyzing` → `filling` → `completed`

### Error Handling
- Chrome extension context validation (`isChromeExtensionValid()`)
- AI service fallback to local analysis if backend fails
- Progressive retry logic for form field interactions
- Safe storage operations with error boundaries

## Configuration Files

### Environment URLs
All API endpoints are configured through the central `config.js`:
- Modify `PRODUCTION` section for deployment
- All modules automatically use `window.CONFIG.getApiBaseUrl()`
- Fallback to localhost if CONFIG is unavailable

### Extension Permissions
The extension requires these permissions (configured in `manifest.json`):
- `activeTab`: Access to current tab content
- `storage`: Local data persistence
- `tabs`: Tab management for login flow
- Host permissions for localhost and all HTTP/HTTPS sites

## Key Integration Points

### API Communication
- All AI calls go through `AIService.callAPI()`
- Endpoints: `/api/autofill/analyze-page`, `/api/autofill/fill-values`
- Automatic retry logic and timeout handling
- Session-based architecture with `sessionId` tracking

### Content Script Injection
The content script loads all autofill modules and provides:
- `window.AutoFillEngine` global for external access
- Floating widget UI for manual triggering
- Automatic form detection on page changes
- Bridge between extension popup and page content

### User Authentication
The extension supports multiple authentication methods with a robust dual-token system:

#### Authentication Methods
1. **Email/Username Login**: Traditional registration and login with form validation
2. **WeChat OAuth**: Original WeChat-based login (maintained for compatibility)
3. **Admin Authentication**: Backend admin authentication (existing system)

#### Dual Token System
- **Access Token**: Short-lived (15 minutes) for API access
- **Refresh Token**: Long-lived (14 days) for token renewal
- Automatic token refresh with retry logic
- Secure storage in `chrome.storage.local`

#### Authentication Flow
1. User registers/logs in via popup forms or WeChat OAuth
2. System stores access/refresh tokens and user info
3. Content scripts automatically include tokens in API calls
4. On 401 errors, system auto-refreshes tokens via message passing
5. Cross-tab synchronization maintains consistent auth state

#### Key Components
- **AuthManager** (`auth-manager.js`): Central authentication handler
- **Popup Forms**: Registration and login UI with validation
- **Token Refresh**: Automatic background refresh every 14 minutes
- **API Integration**: All AIService calls include authentication headers

## Development Notes

### Adding New Autofill Features
1. Create new modules in appropriate `js/autofill/` subdirectory
2. Add to `manifest.json` content_scripts array in dependency order
3. Import/use in `FormFillController` or `AutoFillMain`
4. Follow existing callback pattern for progress/error reporting

### Framework Compatibility
The extension detects and adapts to different frontend frameworks:
- React: Uses React DevTools integration
- Vue: Direct component access
- Angular: Component tree traversal
- Vanilla JS: Standard DOM events

### Debugging
- All modules use consistent `[ModuleName]` logging prefixes
- Enable Chrome DevTools for content script debugging
- Use `showCurrentConfig()` to verify environment settings
- Check `chrome://extensions/` for extension errors