# Step Navigation Feature - "Add Candidate to Step 2"

## Overview
This feature allows users to navigate directly to step 2 (Candidates) of the interview creation stepper, with optional pre-selection of candidate source types.

## Implementation Summary

### ✅ URL Parameter Support
- `?step=N` - Navigate directly to step N (0-3)
- `?source=TYPE` - Pre-select candidate source type
- `?edit=ID&step=1&source=google_sheet` - Edit interview, go to step 2, pre-open Google Sheets

### ✅ Supported Source Types
- `google_sheet` - Google Sheets import
- `excel_file` - Excel/CSV file upload
- `manual_entry` - Manual candidate entry

### ✅ Validation & Error Handling
- Step validation ensures prerequisites are met
- Invalid step parameters redirect to appropriate step
- Invalid source parameters show error messages
- Edit mode allows jumping to any step
- Create mode validates previous steps

### ✅ Auto-Source Selection
- When `source` parameter is provided, the source configuration modal opens automatically
- Source type is validated against allowed options
- Invalid source types display helpful error messages

### ✅ Backend Integration
- Uses existing `/api/interviews/{id}/candidate-sources` endpoints
- No backend changes required
- Proper error handling and success feedback

## Usage Examples

### Direct Navigation URLs
```javascript
// Basic step navigation
/interviews/create?edit=123&step=1

// Step navigation with source pre-selection
/interviews/create?edit=123&step=1&source=google_sheet
/interviews/create?edit=123&step=1&source=excel_file
/interviews/create?edit=123&step=1&source=manual_entry

// Voice settings
/interviews/create?edit=123&step=2

// Communication settings
/interviews/create?edit=123&step=3
```

### Using Utility Functions
```javascript
import { generateAddCandidatesURL, generateStepURL } from './pages/CreateInterview';

// Generate URLs programmatically
const addCandidatesUrl = generateAddCandidatesURL(interviewId);
const googleSheetsUrl = generateAddCandidatesURL(interviewId, 'google_sheet');
const voiceSettingsUrl = generateStepURL(interviewId, 2);
```

### Quick Action Buttons
```javascript
// Example implementation in interview management
const quickActions = [
  {
    label: "Add Candidates",
    url: generateAddCandidatesURL(interviewId),
    icon: "👥"
  },
  {
    label: "Import from Google Sheets", 
    url: generateAddCandidatesURL(interviewId, 'google_sheet'),
    icon: "📊"
  }
];
```

## User Experience Flow

1. **User clicks "Add Candidates"** from interview management
2. **System navigates** to `?edit={id}&step=1`
3. **Validation occurs** - Step 1 prerequisites checked
4. **Step 2 displays** with candidate source options
5. **If source specified**, modal auto-opens for that source type
6. **User completes** candidate addition
7. **Success feedback** and option to continue or return

## Benefits

✅ **Streamlined Workflow** - Direct access to candidate addition
✅ **Flexible Entry Points** - Support for different source types  
✅ **Maintains Validation** - Ensures data integrity
✅ **Backward Compatible** - No breaking changes
✅ **Extensible** - Easy to add more step/source combinations

## Files Modified

- `src/pages/CreateInterview.tsx` - Main implementation
- `src/utils/interviewNavigation.js` - Utility functions and examples
- `STEP_NAVIGATION_FEATURE.md` - This documentation

## Testing Ready
The implementation is ready for testing. The final step would be to:
1. Test direct navigation URLs manually
2. Test validation scenarios
3. Test source pre-selection
4. Test error handling
5. Integration with interview management UI