'use client'

import dynamic from 'next/dynamic'

const FriendsContent = dynamic(
  () => import('./friends-content'),
  { ssr: false }
)

export default function FriendsPage() {
  return <FriendsContent />
}
