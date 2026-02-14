import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Plus, Camera, BarChart3, Trash2, Edit2, Settings } from "lucide-react";
import AddFoodModal from "@/components/AddFoodModal";
import ImageUploadModal from "@/components/ImageUploadModal";
import BarcodeModal from "@/components/BarcodeModal";
import GoalsSettingsModal from "@/components/GoalsSettingsModal";
import EditFoodModal from "@/components/EditFoodModal";
import HistoryTab from "@/components/HistoryTab";

type MealTime = "morning" | "noon" | "evening" | "lateNight";

const mealTimes: { value: MealTime; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "noon", label: "Noon" },
  { value: "evening", label: "Evening" },
  { value: "lateNight", label: "Late Night" },
];

// Default goals - will be overridden by user's custom goals
const DEFAULT_CALORIE_GOAL = 2000;
const DEFAULT_PROTEIN_GOAL = 150;
const DEFAULT_CARBS_GOAL = 250;
const DEFAULT_FATS_GOAL = 65;

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddFood, setShowAddFood] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [showGoalsSettings, setShowGoalsSettings] = useState(false);
  const [editingFood, setEditingFood] = useState<any>(null);
  const [selectedMealTime, setSelectedMealTime] = useState<MealTime>("noon");

  // Queries
  const { data: foodEntries = [], isLoading, refetch } = trpc.food.getFoodsByDate.useQuery({
    date: selectedDate,
  });

  const { data: dailySummary } = trpc.food.getDailySummary.useQuery({
    date: selectedDate,
  });

  const { data: userGoals } = trpc.food.getGoals.useQuery();

  // Mutations
  const deleteFoodMutation = trpc.food.deleteFood.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  if (!user) {
    return <div>Please log in to access the dashboard.</div>;
  }

  // Group food entries by meal time
  const foodsByMealTime = mealTimes.reduce(
    (acc, { value }) => {
      acc[value] = foodEntries.filter((entry) => entry.mealTime === value);
      return acc;
    },
    {} as Record<MealTime, typeof foodEntries>
  );

  // Calculate totals
  const totals = {
    calories: dailySummary?.totalCalories || 0,
    protein: dailySummary?.totalProtein || 0,
    carbs: dailySummary?.totalCarbs || 0,
    fats: dailySummary?.totalFats || 0,
  };

  // Use custom goals or defaults
  const dailyCalorieGoal = userGoals?.dailyCalories || DEFAULT_CALORIE_GOAL;
  const dailyProteinGoal = userGoals?.dailyProtein || DEFAULT_PROTEIN_GOAL;
  const dailyCarbsGoal = userGoals?.dailyCarbs || DEFAULT_CARBS_GOAL;
  const dailyFatsGoal = userGoals?.dailyFats || DEFAULT_FATS_GOAL;

  // Calculate percentages for progress bars
  const caloriePercent = (totals.calories / dailyCalorieGoal) * 100;
  const proteinPercent = (totals.protein / dailyProteinGoal) * 100;
  const carbsPercent = (totals.carbs / dailyCarbsGoal) * 100;
  const fatsPercent = (totals.fats / dailyFatsGoal) * 100;

  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const handleDeleteFood = (id: number) => {
    if (confirm("Are you sure you want to delete this food entry?")) {
      deleteFoodMutation.mutate({ id });
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Calcount</h1>
          <p className="text-slate-600">Track your daily nutrition intake</p>
        </div>

        {/* Date Navigation */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
            <Button variant="outline" size="sm" onClick={() => handleDateChange(-1)} className="flex-1 md:flex-none">
              ← Prev
            </Button>
            <div className="text-base md:text-lg font-semibold text-slate-900 text-center flex-1 md:flex-none md:min-w-[200px]">
              {formatDate(selectedDate)}
            </div>
            <Button variant="outline" size="sm" onClick={() => handleDateChange(1)} className="flex-1 md:flex-none">
              Next →
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
            className="w-full md:w-auto"
          >
            Today
          </Button>
        </div>

        {/* Macro Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Calories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{Math.round(totals.calories)}</div>
              <Progress value={(totals.calories / dailyCalorieGoal) * 100} className="mt-2" />
              <p className="text-xs text-slate-500 mt-2">Goal: {dailyCalorieGoal}</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">Remaining: {Math.max(0, dailyCalorieGoal - Math.round(totals.calories))}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Protein</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{Math.round(totals.protein)}g</div>
              <Progress value={(totals.protein / dailyProteinGoal) * 100} className="mt-2" />
              <p className="text-xs text-slate-500 mt-2">Goal: {dailyProteinGoal}g</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">Remaining: {Math.max(0, dailyProteinGoal - Math.round(totals.protein))}g</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Carbs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{Math.round(totals.carbs)}g</div>
              <Progress value={(totals.carbs / dailyCarbsGoal) * 100} className="mt-2" />
              <p className="text-xs text-slate-500 mt-2">Goal: {dailyCarbsGoal}g</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">Remaining: {Math.max(0, dailyCarbsGoal - Math.round(totals.carbs))}g</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Fats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{Math.round(totals.fats)}g</div>
              <Progress value={(totals.fats / dailyFatsGoal) * 100} className="mt-2" />
              <p className="text-xs text-slate-500 mt-2">Goal: {dailyFatsGoal}g</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">Remaining: {Math.max(0, dailyFatsGoal - Math.round(totals.fats))}g</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <Button
            onClick={() => {
              setSelectedMealTime("noon");
              setShowAddFood(true);
            }}
            className="w-full"
            size="lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Food
          </Button>
          <Button
            onClick={() => setShowImageUpload(true)}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Camera className="mr-2 h-4 w-4" />
            Scan Image
          </Button>
          <Button
            onClick={() => setShowBarcode(true)}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Barcode
          </Button>
          <Button
            onClick={() => setShowGoalsSettings(true)}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Settings className="mr-2 h-4 w-4" />
            Goals
          </Button>
        </div>

        {/* Tabs for Today and History */}
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6 mt-6">
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
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <div className="flex-1">
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
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingFood(entry)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFood(entry.id)}
                            disabled={deleteFoodMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <HistoryTab />
          </TabsContent>
        </Tabs>

      {/* Modals */}
      {showAddFood && (
        <AddFoodModal
          mealTime={selectedMealTime}
          date={selectedDate}
          onClose={() => setShowAddFood(false)}
          onSuccess={() => {
            setShowAddFood(false);
            refetch();
          }}
        />
      )}

      {showImageUpload && (
        <ImageUploadModal
          mealTime={selectedMealTime}
          date={selectedDate}
          onClose={() => setShowImageUpload(false)}
          onSuccess={() => {
            setShowImageUpload(false);
            refetch();
          }}
        />
      )}

      {showBarcode && (
        <BarcodeModal
          mealTime={selectedMealTime}
          date={selectedDate}
          onClose={() => setShowBarcode(false)}
          onSuccess={() => {
            setShowBarcode(false);
            refetch();
          }}
        />
      )}

      {showGoalsSettings && (
        <GoalsSettingsModal
          onClose={() => setShowGoalsSettings(false)}
          onSuccess={() => {
            setShowGoalsSettings(false);
          }}
        />
      )}

      {editingFood && (
        <EditFoodModal
          food={editingFood}
          onClose={() => setEditingFood(null)}
          onSuccess={() => {
            setEditingFood(null);
            refetch();
          }}
        />
      )}
      </div>
    </div>
  );
}

