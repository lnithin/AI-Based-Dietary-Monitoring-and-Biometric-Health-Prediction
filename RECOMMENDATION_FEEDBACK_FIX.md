# Recommendation Accept/Reject Fix

## Issue
The recommendation accept/reject buttons in the frontend were not storing data in the backend.

## Root Cause
**Express Route Ordering Issue**: In Express.js, routes are matched in the order they are defined. The `/api/recommendations/feedback` endpoint was defined AFTER the parameterized routes `/:recId/accept` and `/:recId/reject`. 

This caused Express to try matching `/feedback` as a `recId` parameter, resulting in the endpoint never being reached.

## Solution
Reordered the routes in [backend/src/routes/recommendationRoutes.js](backend/src/routes/recommendationRoutes.js) so that specific routes come BEFORE parameterized routes:

### Fixed Route Order:
1. `GET /` - Get all recommendations
2. `GET /today` - Get today's recommendations  
3. `GET /suggestions` - Get meal suggestions
4. **`POST /feedback`** - Submit feedback (MOVED UP)
5. `POST /` - Create recommendation
6. `GET /:recId` - Get specific recommendation
7. `PUT /:recId/accept` - Accept recommendation
8. `PUT /:recId/reject` - Reject recommendation

## Key Changes
- Moved the `/feedback` endpoint before all `/:recId` routes
- Removed duplicate `/feedback` endpoint that was at the end of the file
- Added comment to prevent future mistakes: `// MUST BE BEFORE /:recId routes`

## What the Endpoint Does
When a user clicks Accept or Reject on a recommendation suggestion:

1. **Creates a Recommendation record** with:
   - User ID
   - Food name
   - Status (accepted/rejected)
   - User feedback
   - Meal type
   
2. **Updates user compliance metrics**:
   - Increments `recommendationsFollowed` (if accepted)
   - Increments `recommendationsIgnored` (if rejected)
   - Recalculates `complianceScore`

3. **Returns success response** to frontend

## Testing
Run the test script to verify functionality:
```bash
cd backend
node test-recommendation-feedback.js
```

This will:
- Test accepting a recommendation
- Test rejecting a recommendation
- Verify recommendations are saved in database
- Check user compliance metrics are updated

## Files Modified
- `backend/src/routes/recommendationRoutes.js` - Fixed route ordering

## Expected Behavior
✅ Clicking "Accept" creates a recommendation with status 'accepted'
✅ Clicking "Reject/Skip" creates a recommendation with status 'rejected'
✅ User compliance metrics are updated
✅ Success message is displayed to user
✅ Recommendations list refreshes

## Verification
Check MongoDB to verify:
```javascript
db.recommendations.find({ userId: ObjectId("...") }).sort({ createdAt: -1 }).limit(5)
db.users.findOne({ _id: ObjectId("...") }, { complianceMetrics: 1 })
```
