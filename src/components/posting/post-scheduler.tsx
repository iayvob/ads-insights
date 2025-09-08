"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Zap, 
  TrendingUp,
  Sun,
  Moon,
  Sunrise,
  Sunset
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"

interface PostSchedulerProps {
  selectedDate: Date | null
  onDateChange: (date: Date | null) => void
}

const optimalTimes = [
  { time: "09:00", label: "Morning Peak", icon: Sunrise, engagement: "High", color: "text-orange-600" },
  { time: "12:00", label: "Lunch Time", icon: Sun, engagement: "Medium", color: "text-yellow-600" },
  { time: "15:00", label: "Afternoon", icon: Sun, engagement: "Medium", color: "text-blue-600" },
  { time: "18:00", label: "Evening Peak", icon: Sunset, engagement: "High", color: "text-purple-600" },
  { time: "21:00", label: "Night", icon: Moon, engagement: "Low", color: "text-gray-600" }
]

const weekdayRecommendations = [
  { day: "Monday", bestTimes: ["09:00", "12:00"], engagement: "Medium" },
  { day: "Tuesday", bestTimes: ["09:00", "15:00"], engagement: "High" },
  { day: "Wednesday", bestTimes: ["09:00", "12:00", "15:00"], engagement: "High" },
  { day: "Thursday", bestTimes: ["09:00", "15:00"], engagement: "High" },
  { day: "Friday", bestTimes: ["09:00", "12:00"], engagement: "Medium" },
  { day: "Saturday", bestTimes: ["10:00", "18:00"], engagement: "Medium" },
  { day: "Sunday", bestTimes: ["12:00", "18:00"], engagement: "Low" }
]

export function PostScheduler({ selectedDate, onDateChange }: PostSchedulerProps) {
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [showOptimalTimes, setShowOptimalTimes] = useState(false)

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const newDate = new Date(date)
      if (selectedTime) {
        const [hours, minutes] = selectedTime.split(':')
        newDate.setHours(parseInt(hours), parseInt(minutes))
      }
      onDateChange(newDate)
    } else {
      onDateChange(null)
    }
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    if (selectedDate) {
      const newDate = new Date(selectedDate)
      const [hours, minutes] = time.split(':')
      newDate.setHours(parseInt(hours), parseInt(minutes))
      onDateChange(newDate)
    }
  }

  const getEngagementColor = (engagement: string) => {
    switch (engagement) {
      case 'High':
        return 'text-green-600 bg-green-100'
      case 'Medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'Low':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getCurrentDayRecommendation = () => {
    const today = new Date().getDay()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return weekdayRecommendations.find(rec => rec.day === dayNames[today])
  }

  const todayRecommendation = getCurrentDayRecommendation()

  return (
    <div className="space-y-4">
      {/* Date Picker */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Select Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate || undefined}
              onSelect={handleDateSelect}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Select Time</Label>
        <Input
          type="time"
          value={selectedTime}
          onChange={(e) => handleTimeSelect(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Optimal Times Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Optimal Times</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowOptimalTimes(!showOptimalTimes)}
          className="text-blue-600 hover:text-blue-700"
        >
          <TrendingUp className="h-4 w-4 mr-1" />
          {showOptimalTimes ? 'Hide' : 'Show'} Suggestions
        </Button>
      </div>

      {/* Optimal Times List */}
      {showOptimalTimes && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          {/* Today's Recommendation */}
          {todayRecommendation && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Today's Best Times</span>
                <Badge className={getEngagementColor(todayRecommendation.engagement)}>
                  {todayRecommendation.engagement}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {todayRecommendation.bestTimes.map((time) => (
                  <Button
                    key={time}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTimeSelect(time)}
                    className="text-xs"
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* All Optimal Times */}
          <div className="grid grid-cols-1 gap-2">
            {optimalTimes.map((timeSlot, index) => (
              <motion.div
                key={timeSlot.time}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => handleTimeSelect(timeSlot.time)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full bg-gray-100`}>
                    <timeSlot.icon className={`h-4 w-4 ${timeSlot.color}`} />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{timeSlot.time}</div>
                    <div className="text-xs text-gray-500">{timeSlot.label}</div>
                  </div>
                </div>
                <Badge className={getEngagementColor(timeSlot.engagement)}>
                  {timeSlot.engagement}
                </Badge>
              </motion.div>
            ))}
          </div>

          {/* AI Suggestion */}
          <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">AI Recommendation</span>
            </div>
            <p className="text-xs text-purple-700">
              Based on your audience analytics, posting at <strong>9:00 AM</strong> on weekdays 
              typically generates 34% higher engagement.
            </p>
          </div>
        </motion.div>
      )}

      {/* Selected Time Summary */}
      {selectedDate && selectedTime && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-green-50 border border-green-200 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">Scheduled for:</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            {format(selectedDate, "EEEE, MMMM do, yyyy 'at' h:mm a")}
          </p>
        </motion.div>
      )}
    </div>
  )
}
