import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type MealTime = "morning" | "noon" | "evening" | "lateNight";

interface AddFoodModalProps {
  mealTime: MealTime;
  date: Date;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddFoodModal({ mealTime, date, onClose, onSuccess }: AddFoodModalProps) {
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("serving");
  const [selectedMealTime, setSelectedMealTime] = useState(mealTime);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateMacrosMutation = trpc.food.calculateMacros.useMutation({
    onSuccess: (data: any) => {
      if (data && data.calories) {
        setCalories(Math.round(data.calories).toString());
        setProtein(Math.round(data.protein * 10) / 10 + "");
        setCarbs(Math.round(data.carbs * 10) / 10 + "");
        setFats(Math.round(data.fats * 10) / 10 + "");
      }
      setIsCalculating(false);
    },
    onError: () => {
      setIsCalculating(false);
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (foodName.trim().length > 2) {
        setIsCalculating(true);
        calculateMacrosMutation.mutate({
          foodName: foodName.trim(),
          quantity: parseFloat(quantity) || 1,
          unit,
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [foodName, quantity, unit]);

  const addFoodMutation = trpc.food.addFood.useMutation({
    onSuccess: () => {
      toast.success("Food entry added!");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add food entry");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!foodName || !calories || !protein || !carbs || !fats) {
      toast.error("Please fill in all fields");
      return;
    }

    addFoodMutation.mutate({
      foodName,
      mealTime: selectedMealTime,
      calories: parseInt(calories),
      protein: parseFloat(protein),
      carbs: parseFloat(carbs),
      fats: parseFloat(fats),
      quantity: parseFloat(quantity),
      unit,
      source: "manual",
      date,
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Food Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
              <Label htmlFor="foodName">Food Name</Label>
            <Input
              id="foodName"
              placeholder="e.g., Chicken Breast (macros auto-calculated)"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
            />
            {isCalculating && foodName.trim().length > 2 && (
              <p className="text-xs text-slate-500 mt-1">Calculating macros...</p>
            )}
          </div>

          <div>
            <Label htmlFor="mealTime">Meal Time</Label>
            <Select value={selectedMealTime} onValueChange={(value) => setSelectedMealTime(value as MealTime)}>
              <SelectTrigger id="mealTime">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="noon">Noon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
                <SelectItem value="lateNight">Late Night</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="serving">Serving</SelectItem>
                  <SelectItem value="grams">Grams</SelectItem>
                  <SelectItem value="ml">ML</SelectItem>
                  <SelectItem value="piece">Piece</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="calories">Calories</Label>
              <Input
                id="calories"
                type="number"
                placeholder="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                step="0.1"
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                step="0.1"
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fats">Fats (g)</Label>
              <Input
                id="fats"
                type="number"
                step="0.1"
                placeholder="0"
                value={fats}
                onChange={(e) => setFats(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={addFoodMutation.isPending || isCalculating}>
              {addFoodMutation.isPending ? "Adding..." : "Add Food"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
