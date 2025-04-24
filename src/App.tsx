import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Calendar, Clock, Users, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { auth, db } from '@/lib/firebase-config'
import { useAuthState } from 'react-firebase-hooks/auth'
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot
} from 'firebase/firestore'

// Types
type UserType = {
  id: string
  name: string
  email: string
  instrument: string
  color: string
}

type Availability = {
  id: string
  userId: string
  date: string
  status: 'available' | 'unavailable' | 'maybe'
  notes: string
}

type Rehearsal = {
  id: string
  date: string
  time: string
  duration: string
  location: string
  description: string
  participants: string[]
}

export default function App() {
  const [user, loading] = useAuthState(auth)
  const [users, setUsers] = useState<UserType[]>([])
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd')

  // Load data from Firestore
  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserType[]
      setUsers(usersData)
    })

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!user) return

    const unsubscribe = onSnapshot(collection(db, 'rehearsals'), (snapshot) => {
      const rehearsalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Rehearsal[]
      setRehearsals(rehearsalsData)
    })

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!user) return

    const q = query(collection(db, 'availabilities'), where('userId', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const availabilitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Availability[]
      setAvailabilities(availabilitiesData)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  // Calendar functions
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1)
    const days = []
    
    while (date.getMonth() === month) {
      days.push(new Date(date))
      date.setDate(date.getDate() + 1)
    }
    
    return days
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1
    ))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1
    ))
  }

  const daysInMonth = getDaysInMonth(
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  )

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Please sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You need to be signed in to access the rehearsal scheduler.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Rehearsal Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Month navigation */}
          <div className="flex justify-between items-center mb-6">
            <Button variant="outline" onClick={prevMonth}>
              Previous
            </Button>
            <h2 className="text-xl font-semibold">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <Button variant="outline" onClick={nextMonth}>
              Next
            </Button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-medium py-2">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {daysInMonth.map((day, index) => {
              const dateStr = formatDate(day)
              const userAvailability = availabilities.find(a => a.date === dateStr)
              const rehearsal = rehearsals.find(r => r.date === dateStr)

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-2 min-h-24 ${
                    day.getMonth() !== currentMonth.getMonth()
                      ? 'opacity-50'
                      : ''
                  } ${
                    rehearsal
                      ? 'bg-blue-50 border-blue-200'
                      : userAvailability?.status === 'available'
                      ? 'bg-green-50 border-green-200'
                      : userAvailability?.status === 'unavailable'
                      ? 'bg-red-50 border-red-200'
                      : userAvailability?.status === 'maybe'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{day.getDate()}</span>
                  </div>

                  {rehearsal && (
                    <div className="mt-2 text-xs space-y-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{rehearsal.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{rehearsal.location}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-green-50 border border-green-200" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-blue-50 border border-blue-200" />
              <span>Scheduled Rehearsal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-red-50 border border-red-200" />
              <span>Unavailable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-yellow-50 border border-yellow-200" />
              <span>Maybe</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
