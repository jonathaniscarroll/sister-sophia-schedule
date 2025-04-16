import { useState, useRef, useEffect } from 'react'
import { Calendar, Clock, Users, User, Plus, X, Check, Edit, Trash, Lock, CheckCircle } from 'lucide-react'
import { Button } from "/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "/components/ui/card"
import { Input } from "/components/ui/input"
import { Textarea } from "/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "/components/ui/select"

type User = {
  id: string
  name: string
  email: string
  instrument: string
  color: string
}

type Availability = {
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

export default function FixedDragScheduler() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [users, setUsers] = useState<User[]>([
    { id: '1', name: 'Alice', email: 'alice@example.com', instrument: 'Violin', color: 'bg-blue-500' },
    { id: '2', name: 'Bob', email: 'bob@example.com', instrument: 'Cello', color: 'bg-green-500' },
    { id: '3', name: 'Charlie', email: 'charlie@example.com', instrument: 'Piano', color: 'bg-purple-500' },
  ])
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([])
  const [isAddingRehearsal, setIsAddingRehearsal] = useState(false)
  const [isManagingTeam, setIsManagingTeam] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    instrument: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [newRehearsal, setNewRehearsal] = useState({
    date: '',
    time: '18:00',
    duration: '2 hours',
    location: '',
    description: ''
  })

  // Drag selection state
  const [currentUser, setCurrentUser] = useState<string>('')
  const [markingMode, setMarkingMode] = useState<'available' | 'unavailable'>('available')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null)
  const [dragEndDate, setDragEndDate] = useState<Date | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Generate days for the current month view
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

  // Handle month navigation - FIXED: Create new Date objects
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

  // Validate user input
  const validateUser = (user: Partial<User>) => {
    const newErrors: Record<string, string> = {}
    if (!user.name?.trim()) newErrors.name = 'Name is required'
    if (user.email && !/^\S+@\S+\.\S+$/.test(user.email)) newErrors.email = 'Invalid email format'
    return newErrors
  }

  // Add a new user
  const addUser = () => {
    const validationErrors = validateUser(newUser)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    const colors = ['bg-red-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500']
    const addedUser: User = {
      id: Date.now().toString(),
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      instrument: newUser.instrument.trim(),
      color: colors[users.length % colors.length]
    }

    setUsers([...users, addedUser])
    setNewUser({ name: '', email: '', instrument: '' })
    setErrors({})
  }

  // Edit an existing user
  const editUser = () => {
    if (!editingUser) return

    const validationErrors = validateUser(editingUser)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setUsers(users.map(u => u.id === editingUser.id ? editingUser : u))
    setEditingUser(null)
    setErrors({})
  }

  // Delete a user
  const deleteUser = (userId: string) => {
    if (window.confirm('Are you sure you want to delete this team member?')) {
      setUsers(users.filter(u => u.id !== userId))
      setAvailabilities(availabilities.filter(a => a.userId !== userId))
      setRehearsals(rehearsals.map(r => ({
        ...r,
        participants: r.participants.filter(p => p !== userId)
      })))
    }
  }

  // Get availability for a user on a specific date
  const getUserAvailability = (userId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return availabilities.find(a => a.userId === userId && a.date === dateStr)
  }

  // Check if a date has a rehearsal scheduled
  const hasRehearsal = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return rehearsals.some(r => r.date === dateStr)
  }

  // Get rehearsal details for a date
  const getRehearsal = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return rehearsals.find(r => r.date === dateStr)
  }

  // Schedule a new rehearsal
  const scheduleRehearsal = () => {
    if (!newRehearsal.date || !newRehearsal.time || !newRehearsal.location) {
      alert('Please fill in all required fields')
      return
    }

    const newRehearsalEntry: Rehearsal = {
      id: Date.now().toString(),
      date: newRehearsal.date,
      time: newRehearsal.time,
      duration: newRehearsal.duration,
      location: newRehearsal.location,
      description: newRehearsal.description,
      participants: users.map(u => u.id) // Default to all users
    }

    setRehearsals([...rehearsals, newRehearsalEntry])
    setNewRehearsal({
      date: '',
      time: '18:00',
      duration: '2 hours',
      location: '',
      description: ''
    })
    setIsAddingRehearsal(false)
  }

  // Drag selection handlers - FIXED: Create new Date objects instead of modifying
  const handleDragStart = (date: Date) => {
    if (!currentUser) return
    setIsDragging(true)
    setDragStartDate(new Date(date))
    setDragEndDate(new Date(date))
  }

  const handleDragEnter = (date: Date) => {
    if (!isDragging || !dragStartDate) return
    setDragEndDate(new Date(date))
  }

  const handleDragEnd = () => {
    if (!isDragging || !dragStartDate || !dragEndDate || !currentUser) {
      setIsDragging(false)
      return
    }

    // Sort dates chronologically
    const start = dragStartDate < dragEndDate ? new Date(dragStartDate) : new Date(dragEndDate)
    const end = dragStartDate < dragEndDate ? new Date(dragEndDate) : new Date(dragStartDate)

    // Create new availabilities for each day in range
    const newAvailabilities: Availability[] = []
    const currentDate = new Date(start)
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0]
      
      // Remove any existing availability for this user/date
      const existingIndex = availabilities.findIndex(
        a => a.userId === currentUser && a.date === dateStr
      )

      if (existingIndex >= 0) {
        // Update existing - FIXED: Create new array instead of modifying
        const updated = [...availabilities]
        updated[existingIndex] = {
          ...updated[existingIndex],
          status: markingMode
        }
        setAvailabilities(updated)
      } else {
        // Add new
        newAvailabilities.push({
          userId: currentUser,
          date: dateStr,
          status: markingMode,
          notes: ''
        })
      }

      // FIXED: Create new Date instead of modifying
      currentDate.setDate(currentDate.getDate() + 1)
    }

    if (newAvailabilities.length > 0) {
      setAvailabilities([...availabilities, ...newAvailabilities])
    }

    setIsDragging(false)
    setDragStartDate(null)
    setDragEndDate(null)
  }

  // Check if a date is in the current drag selection
  const isDateInDragSelection = (date: Date) => {
    if (!isDragging || !dragStartDate || !dragEndDate) return false

    const start = dragStartDate < dragEndDate ? dragStartDate : dragEndDate
    const end = dragStartDate < dragEndDate ? dragEndDate : dragStartDate

    return date >= start && date <= end && date.getMonth() === currentMonth.getMonth()
  }

  // Custom Modal Component
  const Modal = ({ isOpen, onClose, children, title }: {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    title: string
  }) => {
    if (!isOpen) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{title}</CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
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
                <Select onValueChange={setCurrentUser} value={currentUser}>
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
              const dateStr = day.toISOString().split('T')[0]
              const rehearsal = getRehearsal(day)
              const isRehearsal = hasRehearsal(day)
              const userAvailability = currentUser ? getUserAvailability(currentUser, day) : null
              const isInDragSelection = isDateInDragSelection(day)

              // Determine cell appearance
              let cellAppearance = 'bg-muted'
              if (isInDragSelection) {
                cellAppearance = markingMode === 'available' 
                  ? 'bg-green-100 border-green-300' 
                  : 'bg-red-100 border-red-300'
              } else if (isRehearsal) {
                cellAppearance = 'bg-blue-50 border-blue-200'
              } else if (userAvailability) {
                cellAppearance = userAvailability.status === 'available' 
                  ? 'bg-green-50 border-green-200' 
                  : userAvailability.status === 'unavailable' 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-yellow-50 border-yellow-200'
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
                      const availability = getUserAvailability(user.id, day)
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
                      )
                    })}
                  </div>
                </div>
              )
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
              setIsManagingTeam(false)
              setEditingUser(null)
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
                      value={editingUser?.name || newUser.name}
                      onChange={(e) => 
                        editingUser
                          ? setEditingUser({...editingUser, name: e.target.value})
                          : setNewUser({...newUser, name: e.target.value})
                      }
                      placeholder="Full name"
                    />
                    {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email
                    </label>
                    <Input
                      value={editingUser?.email || newUser.email}
                      onChange={(e) => 
                        editingUser
                          ? setEditingUser({...editingUser, email: e.target.value})
                          : setNewUser({...newUser, email: e.target.value})
                      }
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
                      value={editingUser?.instrument || newUser.instrument}
                      onChange={(e) => 
                        editingUser
                          ? setEditingUser({...editingUser, instrument: e.target.value})
                          : setNewUser({...newUser, instrument: e.target.value})
                      }
                      placeholder="Primary instrument"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  {editingUser && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingUser(null)
                        setErrors({})
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
                  value={newRehearsal.date}
                  onChange={(e) => setNewRehearsal({...newRehearsal, date: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Time *
                  </label>
                  <Input
                    type="time"
                    value={newRehearsal.time}
                    onChange={(e) => setNewRehearsal({...newRehearsal, time: e.target.value})}
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
                  value={newRehearsal.location}
                  onChange={(e) => setNewRehearsal({...newRehearsal, location: e.target.value})}
                  placeholder="Enter location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Textarea
                  value={newRehearsal.description}
                  onChange={(e) => setNewRehearsal({...newRehearsal, description: e.target.value})}
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
