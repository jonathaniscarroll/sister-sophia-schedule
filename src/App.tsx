import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Calendar, Clock, Users, Plus, CheckCircle, Lock, Edit, Trash, Check,Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { auth, db } from '@/lib/firebase-config'
import { useAuthState } from 'react-firebase-hooks/auth'
import { 
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  getDocs
} from 'firebase/firestore'
import { getAuth } from "firebase/auth"
import Auth from '@/components/Auth'
import Modal from '@/components/Modal'

// Types
type UserType = {
  id: string
  name: string
  email?: string
  instrument?: string
  color: string
}

type Availability = {
  id: string
  userId: string
  date: string
  status: 'available' | 'unavailable' | 'maybe'
}

type Rehearsal = {
  id: string
  date: string
  time: string
  duration: string
  location: string
  description: string
  participants: string[]
  createdAt: Date
}

export default function App() {
  // Auth state
  const [user, loading, error] = useAuthState(auth)
  
  // App state
  const [users, setUsers] = useState<UserType[]>([])
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [markingMode, setMarkingMode] = useState<'available' | 'unavailable'>('available')
  const [isManagingTeam, setIsManagingTeam] = useState(false)
  const [isAddingRehearsal, setIsAddingRehearsal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [dragSelection, setDragSelection] = useState<Date[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Form states
  const [newUser, setNewUser] = useState<Omit<UserType, 'id'>>({ 
    name: '',
    email: '',
    instrument: '',
    color: `bg-[#${Math.floor(Math.random()*16777215).toString(16)}]`
  })
  
  const [newRehearsal, setNewRehearsal] = useState<Omit<Rehearsal, 'id' | 'createdAt'>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '19:00',
    duration: '2 hours',
    location: '',
    description: '',
    participants: []
  })

  const calendarRef = useRef<HTMLDivElement>(null)

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd')

  // Load data from Firebase
  useEffect(() => {
    if (!user) return

    // Load users
    const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserType[]
      setUsers(usersData)
    })

    // Load availabilities
    const availabilitiesUnsubscribe = onSnapshot(
      query(collection(db, 'availabilities'), where('userId', '==', user.uid)),
      (snapshot) => {
        const availabilitiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Availability[]
        setAvailabilities(availabilitiesData)
      }
    )

    // Load rehearsals
    const rehearsalsUnsubscribe = onSnapshot(collection(db, 'rehearsals'), (snapshot) => {
      const rehearsalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as Rehearsal[]
      setRehearsals(rehearsalsData)
    })

    return () => {
      usersUnsubscribe()
      availabilitiesUnsubscribe()
      rehearsalsUnsubscribe()
    }
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

  const daysInMonth = getDaysInMonth(
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  )

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

  // Availability functions
  const getUserAvailability = (userId: string, date: Date) => {
    const dateStr = formatDate(date)
    return availabilities.find(a => a.userId === userId && a.date === dateStr)
  }

  const handleDragStart = (date: Date) => {
    if (!currentUser) return
    setIsDragging(true)
    setDragSelection([date])
  }

  const handleDragEnter = (date: Date) => {
    if (!isDragging || !currentUser) return
    setDragSelection(prev => [...prev, date])
  }

  const handleDragEnd = async () => {
    if (!isDragging || !currentUser || dragSelection.length === 0) {
      setIsDragging(false)
      setDragSelection([])
      return
    }

    try {
      // Get unique dates from drag selection
      const uniqueDates = Array.from(new Set(dragSelection.map(d => formatDate(d))))
      
      // Update availabilities in Firebase
      const batchPromises = uniqueDates.map(async (dateStr) => {
        const existingAvailability = availabilities.find(
          a => a.userId === currentUser && a.date === dateStr
        )

        if (existingAvailability) {
          // Update existing availability
          await updateDoc(doc(db, 'availabilities', existingAvailability.id), {
            status: markingMode
          })
        } else {
          // Create new availability
          await setDoc(doc(collection(db, 'availabilities')), {
            userId: currentUser,
            date: dateStr,
            status: markingMode,
            createdAt: serverTimestamp()
          })
        }
      })

      await Promise.all(batchPromises)
    } catch (error) {
      console.error("Error updating availabilities:", error)
    } finally {
      setIsDragging(false)
      setDragSelection([])
    }
  }

  // Team management functions
  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (editingUser) {
      setEditingUser({ ...editingUser, [name]: value })
    } else {
      setNewUser({ ...newUser, [name]: value })
    }
  }

  const validateUser = () => {
    const newErrors: Record<string, string> = {}
    if (!(editingUser || newUser).name) newErrors.name = "Name is required"
    if ((editingUser || newUser).email && !/^\S+@\S+\.\S+$/.test((editingUser || newUser).email || '')) {
      newErrors.email = "Invalid email format"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const addUser = async () => {
    if (!validateUser()) return

    try {
      await setDoc(doc(collection(db, 'users')), {
        ...newUser,
        createdAt: serverTimestamp()
      })
      setNewUser({ 
        name: '',
        email: '',
        instrument: '',
        color: `bg-[#${Math.floor(Math.random()*16777215).toString(16)}]`
      })
      setErrors({})
    } catch (error) {
      console.error("Error adding user:", error)
    }
  }

  const editUser = async () => {
    if (!editingUser || !validateUser()) return

    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        ...editingUser
      })
      setEditingUser(null)
      setErrors({})
    } catch (error) {
      console.error("Error editing user:", error)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this team member?")) return

    try {
      // Delete user
      await deleteDoc(doc(db, 'users', userId))
      
      // Delete related availabilities
      const availabilityQuery = query(
        collection(db, 'availabilities'),
        where('userId', '==', userId)
      )
      const availabilitySnapshot = await getDocs(availabilityQuery)
      const deletePromises = availabilitySnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      )
      await Promise.all(deletePromises)
    } catch (error) {
      console.error("Error deleting user:", error)
    }
  }

  // Rehearsal functions
  const hasRehearsal = (date: Date) => {
    const dateStr = formatDate(date)
    return rehearsals.some(r => r.date === dateStr)
  }

  const getRehearsal = (date: Date) => {
    const dateStr = formatDate(date)
    return rehearsals.find(r => r.date === dateStr)
  }

  const isDateInDragSelection = (date: Date) => {
    return dragSelection.some(d => d.getTime() === date.getTime())
  }

  const handleRehearsalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewRehearsal({ ...newRehearsal, [name]: value })
  }

  const scheduleRehearsal = async () => {
    if (!newRehearsal.date || !newRehearsal.time || !newRehearsal.location) {
      alert("Please fill in all required fields")
      return
    }

    try {
      await setDoc(doc(collection(db, 'rehearsals')), {
        ...newRehearsal,
        participants: users.map(u => u.id),
        createdAt: serverTimestamp()
      })
      setIsAddingRehearsal(false)
      setNewRehearsal({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '19:00',
        duration: '2 hours',
        location: '',
        description: '',
        participants: []
      })
    } catch (error) {
      console.error("Error scheduling rehearsal:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="text-red-500">
            Error: {error.message}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <Auth />
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                Team Rehearsal Scheduler
              </CardTitle>
              <CardDescription>
                Manage team members, availabilities, and schedule rehearsals
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsManagingTeam(true)} variant="outline">
                <Users className="h-4 w-4 mr-2" /> Manage Team
              </Button>
              <Button onClick={() => setIsAddingRehearsal(true)}>
                <Plus className="h-4 w-4 mr-2" /> Schedule Rehearsal
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* User Selection and Marking Mode */}
          <div className="mb-6 p-4 border rounded-lg bg-muted">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  I am:
                </label>
                <Select onValueChange={setCurrentUser} value={currentUser || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your name" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${user.color}`} />
                          {user.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  I want to mark:
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={markingMode === 'available' ? 'default' : 'outline'}
                    onClick={() => setMarkingMode('available')}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Available
                  </Button>
                  <Button
                    variant={markingMode === 'unavailable' ? 'default' : 'outline'}
                    onClick={() => setMarkingMode('unavailable')}
                    className="flex-1"
                  >
                    <Lock className="h-4 w-4 mr-2" /> Unavailable
                  </Button>
                </div>
              </div>
            </div>
            {currentUser && (
              <p className="mt-2 text-sm text-muted-foreground">
                Click and drag across dates to mark your {markingMode === 'available' ? 'availability' : 'unavailability'}
              </p>
            )}
          </div>

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
          <div 
            className="grid grid-cols-7 gap-2"
            ref={calendarRef}
            onMouseLeave={handleDragEnd}
          >
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-medium py-2">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {daysInMonth.map((day, index) => {
              const rehearsal = getRehearsal(day);
              const isRehearsal = hasRehearsal(day);
              const userAvailability = currentUser ? getUserAvailability(currentUser, day) : null;
              const isInDragSelection = isDateInDragSelection(day);

              // Determine cell appearance
              let cellAppearance = 'bg-muted';
              if (isInDragSelection) {
                cellAppearance = markingMode === 'available' 
                  ? 'bg-green-100 border-green-300' 
                  : 'bg-red-100 border-red-300';
              } else if (isRehearsal) {
                cellAppearance = 'bg-blue-50 border-blue-200';
              } else if (userAvailability) {
                cellAppearance = userAvailability.status === 'available' 
                  ? 'bg-green-50 border-green-200' 
                  : userAvailability.status === 'unavailable' 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-yellow-50 border-yellow-200';
              }

              return (
                <div
                  key={index}
                  onMouseDown={() => handleDragStart(day)}
                  onMouseEnter={() => handleDragEnter(day)}
                  onMouseUp={handleDragEnd}
                  className={`border rounded-lg p-2 min-h-32 cursor-pointer select-none ${
                    day.getMonth() !== currentMonth.getMonth() ? 'opacity-50' : ''
                  } ${cellAppearance}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{day.getDate()}</span>
                    {isRehearsal && (
                      <div className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                        Rehearsal
                      </div>
                    )}
                  </div>

                  {/* User availability indicators */}
                  <div className="mt-2 space-y-1">
                    {users.map(user => {
                      const availability = getUserAvailability(user.id, day);
                      return (
                        <div key={user.id} className="flex items-center gap-1">
                          <div className={`h-2 w-2 rounded-full ${user.color}`} />
                          <span className="text-xs truncate">
                            {availability
                              ? availability.status === 'available'
                                ? '✓'
                                : availability.status === 'unavailable'
                                ? '✗'
                                : '?'
                              : '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-green-50 border border-green-200" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-red-50 border border-red-200" />
              <span>Unavailable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-blue-50 border border-blue-200" />
              <span>Scheduled Rehearsal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-yellow-50 border border-yellow-200" />
              <span>Maybe Available</span>
            </div>
          </div>

          {/* Team Management Modal */}
          <Modal
            isOpen={isManagingTeam}
            onClose={() => {
              setIsManagingTeam(false);
              setEditingUser(null);
            }}
            title="Manage Team Members"
          >
            <div className="space-y-6">
              {/* Add New Member */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-4">
                  {editingUser ? 'Edit Team Member' : 'Add New Team Member'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Name *
                    </label>
                    <Input
                      name="name"
                      value={editingUser?.name || newUser.name}
                      onChange={handleUserInputChange}
                      placeholder="Full name"
                    />
                    {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email
                    </label>
                    <Input
                      name="email"
                      value={editingUser?.email || newUser.email}
                      onChange={handleUserInputChange}
                      placeholder="Email address"
                      type="email"
                    />
                    {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Instrument
                    </label>
                    <Input
                      name="instrument"
                      value={editingUser?.instrument || newUser.instrument}
                      onChange={handleUserInputChange}
                      placeholder="Primary instrument"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  {editingUser && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingUser(null);
                        setErrors({});
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    onClick={editingUser ? editUser : addUser}
                    className="ml-2"
                  >
                    {editingUser ? 'Save Changes' : 'Add Team Member'}
                  </Button>
                </div>
              </div>

              {/* Team Members List */}
              <div>
                <h3 className="font-medium mb-2">Current Team Members</h3>
                <div className="space-y-2">
                  {users.length > 0 ? (
                    users.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`h-4 w-4 rounded-full ${user.color}`} />
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <div className="flex gap-3 text-sm text-muted-foreground">
                              {user.email && <span>{user.email}</span>}
                              {user.instrument && <span>• {user.instrument}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUser(user.id)}
                          >
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No team members added yet</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={() => setIsManagingTeam(false)}>
                Done
              </Button>
            </div>
          </Modal>

          {/* Schedule Rehearsal Modal */}
          <Modal
            isOpen={isAddingRehearsal}
            onClose={() => setIsAddingRehearsal(false)}
            title="Schedule New Rehearsal"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Date *
                </label>
                <Input
                  type="date"
                  name="date"
                  value={newRehearsal.date}
                  onChange={handleRehearsalInputChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Time *
                  </label>
                  <Input
                    type="time"
                    name="time"
                    value={newRehearsal.time}
                    onChange={handleRehearsalInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Duration
                  </label>
                  <Select
                    value={newRehearsal.duration}
                    onValueChange={(value) => setNewRehearsal({...newRehearsal, duration: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 hour">1 hour</SelectItem>
                      <SelectItem value="1.5 hours">1.5 hours</SelectItem>
                      <SelectItem value="2 hours">2 hours</SelectItem>
                      <SelectItem value="3 hours">3 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Location *
                </label>
                <Input
                  name="location"
                  value={newRehearsal.location}
                  onChange={handleRehearsalInputChange}
                  placeholder="Enter location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Textarea
                  name="description"
                  value={newRehearsal.description}
                  onChange={handleRehearsalInputChange}
                  placeholder="Enter rehearsal details"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Participants ({users.length})
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${user.color}`} />
                      <span>{user.name}</span>
                      {user.instrument && (
                        <span className="text-xs text-muted-foreground ml-auto">({user.instrument})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setIsAddingRehearsal(false)}
              >
                Cancel
              </Button>
              <Button onClick={scheduleRehearsal}>
                <Check className="h-4 w-4 mr-2" /> Schedule Rehearsal
              </Button>
            </div>
          </Modal>

          {/* Scheduled Rehearsals List */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Upcoming Rehearsals</h3>
            <div className="space-y-4">
              {rehearsals.length > 0 ? (
                rehearsals.map(rehearsal => (
                  <Card key={rehearsal.id}>
                    <CardHeader>
                      <CardTitle>{rehearsal.description}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(rehearsal.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {rehearsal.time} ({rehearsal.duration})
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {rehearsal.participants.length} attending
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p>Location: {rehearsal.location}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-muted-foreground">No rehearsals scheduled yet</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}