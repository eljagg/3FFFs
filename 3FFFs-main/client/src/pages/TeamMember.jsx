import { useParams } from 'react-router-dom'
import MyProgress from './MyProgress.jsx'

/**
 * TeamMember — manager view of a specific user's progress (v25.7.0, ISS-017).
 *
 * Re-uses MyProgress with userIdOverride from the URL params and
 * viewerMode='manager' so the header reads as a manager-context view.
 *
 * Authorisation is enforced server-side: /api/progress/user/:id/full
 * returns 403 if the requesting manager is not in the same Bank as
 * the target user AND not their direct manager.
 *
 * v25.7.1 will add the comments thread to the bottom of this page.
 */
export default function TeamMember() {
  const { userId } = useParams()
  return <MyProgress userIdOverride={userId} viewerMode="manager" />
}
