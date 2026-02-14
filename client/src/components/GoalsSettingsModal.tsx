import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import BMICalculator from "./BMICalculator";

interface GoalsSettingsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function GoalsSettingsModal({ onClose, onSuccess }: GoalsSettingsModalProps) {
  const { data: currentGoals } = trpc.food.getGoals.useQuery();
  const updateGoalsMutation = trpc.food.updateGoals.useMutation({
    onSuccess: () => {
      toast.success("Goals updated successfully!");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update goals");
    },
  });

  const [dailyCalories, setDailyCalories] = useState(currentGoals?.dailyCalories || 2000);
  const [dailyProtein, setDailyProtein] = useState(currentGoals?.dailyProtein || 150);
  const [dailyCarbs, setDailyCarbs] = useState(currentGoals?.dailyCarbs || 250);
  const [dailyFats, setDailyFats] = useState(currentGoals?.dailyFats || 65);

  useEffect(() => {
    if (currentGoals) {
      setDailyCalories(currentGoals.dailyCalories || 2000);
      setDailyProtein(currentGoals.dailyProtein || 150);
      setDailyCarbs(currentGoals.dailyCarbs || 250);
      setDailyFats(currentGoals.dailyFats || 65);
    }
  }, [currentGoals]);

  const handleSaveGoals = () => {
    updateGoalsMutation.mutate({
      dailyCalories: Math.round(dailyCalories),
      dailyProtein: Math.round(dailyProtein * 10) / 10,
      dailyCarbs: Math.round(dailyCarbs * 10) / 10,
      dailyFats: Math.round(dailyFats * 10) / 10,
    });
  };

  const handleBMICalculate = (data: any) => {
    // Just update state, user will click Apply button
  };

  const handleApplyBMIGoals = (macros: any) => {
    updateGoalsMutation.mutate({
      dailyCalories: macros.dailyCalories,
      dailyProtein: macros.dailyProtein,
      dailyCarbs: macros.dailyCarbs,
      dailyFats: macros.dailyFats,
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Daily Goals & Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="goals" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="goals">Custom Goals</TabsTrigger>
            <TabsTrigger value="bmi">BMI Calculator</TabsTrigger>
          </TabsList>

          <TabsContent value="goals" className="space-y-6 mt-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Daily Calories</Label>
                <span className="text-2xl font-bold text-slate-900">{Math.round(dailyCalories)}</span>
              </div>
              <Slider
                value={[dailyCalories]}
                onValueChange={(value) => setDailyCalories(value[0])}
                min={500}
                max={5000}
                step={50}
                className="w-full"
              />
              <div className="text-xs text-slate-500 mt-2">Range: 500 - 5000 calories</div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Daily Protein (g)</Label>
                <span className="text-2xl font-bold text-slate-900">{Math.round(dailyProtein)}</span>
              </div>
              <Slider
                value={[dailyProtein]}
                onValueChange={(value) => setDailyProtein(value[0])}
                min={0}
                max={500}
                step={5}
                className="w-full"
              />
              <div className="text-xs text-slate-500 mt-2">Range: 0 - 500g</div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Daily Carbs (g)</Label>
                <span className="text-2xl font-bold text-slate-900">{Math.round(dailyCarbs)}</span>
              </div>
              <Slider
                value={[dailyCarbs]}
                onValueChange={(value) => setDailyCarbs(value[0])}
                min={0}
                max={1000}
                step={10}
                className="w-full"
              />
              <div className="text-xs text-slate-500 mt-2">Range: 0 - 1000g</div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Daily Fats (g)</Label>
                <span className="text-2xl font-bold text-slate-900">{Math.round(dailyFats)}</span>
              </div>
              <Slider
                value={[dailyFats]}
                onValueChange={(value) => setDailyFats(value[0])}
                min={0}
                max={500}
                step={5}
                className="w-full"
              />
              <div className="text-xs text-slate-500 mt-2">Range: 0 - 500g</div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveGoals}
                className="flex-1"
                disabled={updateGoalsMutation.isPending}
              >
                {updateGoalsMutation.isPending ? "Saving..." : "Save Goals"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="bmi" className="mt-6">
            <BMICalculator
              onCalculate={handleBMICalculate}
              onApplyGoals={handleApplyBMIGoals}
              initialData={currentGoals && 'height' in currentGoals ? {
                height: currentGoals.height || undefined,
                weight: currentGoals.weight || undefined,
                age: currentGoals.age || undefined,
                gender: (currentGoals as any).gender || undefined,
                activityLevel: (currentGoals as any).activityLevel || undefined,
              } : undefined}
            />
            <div className="flex gap-2 pt-4 mt-6">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
