import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function HistoryTab() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: foodEntries = [], isLoading } = trpc.food.getFoodsByDate.useQuery({
    date: selectedDate,
  });

  const { data: dailySummary } = trpc.food.getDailySummary.useQuery({
    date: selectedDate,
  });

  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setSelectedDate(newDate);
    }
  };

  const totals = {
    calories: dailySummary?.totalCalories || 0,
    protein: dailySummary?.totalProtein || 0,
    carbs: dailySummary?.totalCarbs || 0,
    fats: dailySummary?.totalFats || 0,
  };

  const mealTimes = [
    { value: "morning", label: "Morning" },
    { value: "noon", label: "Noon" },
    { value: "evening", label: "Evening" },
    { value: "lateNight", label: "Late Night" },
  ];

  const foodsByMealTime = mealTimes.reduce(
    (acc, { value }) => {
      acc[value] = foodEntries.filter((entry) => entry.mealTime === value);
      return acc;
    },
    {} as Record<string, typeof foodEntries>
  );

  const dateString = selectedDate.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateChange(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={dateString}
              onChange={handleDateInput}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateChange(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Daily Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Calories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{Math.round(totals.calories)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Protein</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{Math.round(totals.protein)}g</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Carbs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{Math.round(totals.carbs)}g</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Fats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{Math.round(totals.fats)}g</div>
          </CardContent>
        </Card>
      </div>

      {/* Meal Entries by Time */}
      <div className="space-y-6">
        {mealTimes.map(({ value, label }) => (
          <Card key={value}>
            <CardHeader>
              <CardTitle className="text-lg">{label}</CardTitle>
              <CardDescription>
                {foodsByMealTime[value].length} item(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {foodsByMealTime[value].length === 0 ? (
                <p className="text-slate-500 text-center py-8">No entries for {label.toLowerCase()}</p>
              ) : (
                <div className="space-y-4">
                  {foodsByMealTime[value].map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <h4 className="font-semibold text-slate-900">{entry.foodName}</h4>
                      <p className="text-sm text-slate-600">
                        {entry.quantity} {entry.unit}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-slate-600">
                        <span>{entry.calories} cal</span>
                        <span>{Math.round(entry.protein)}g protein</span>
                        <span>{Math.round(entry.carbs)}g carbs</span>
                        <span>{Math.round(entry.fats)}g fats</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
