"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

const timeSlots = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
];

interface CalendarPickerProps {
  onSelect: (date: Date, time: string) => void;
  selectedDate?: Date;
  selectedTime?: string;
}

export function CalendarPicker({
  onSelect,
  selectedDate,
  selectedTime,
}: CalendarPickerProps) {
  const [date, setDate] = useState<Date | undefined>(selectedDate);

  const handleDateSelect = (d: Date | undefined) => {
    if (d) {
      setDate(d);
    }
  };

  const handleTimeSelect = (time: string) => {
    if (date) {
      onSelect(date, time);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium">Select Date</p>
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          disabled={(d) => d < new Date()}
          className="rounded-md border"
        />
      </div>

      {date && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm font-medium">Available Times</p>
          <div className="grid grid-cols-2 gap-2">
            {timeSlots.map((slot) => (
              <Button
                key={slot}
                variant={selectedTime === slot ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeSelect(slot)}
              >
                {slot}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
