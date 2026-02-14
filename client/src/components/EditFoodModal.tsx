import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";


type MealTime = "morning" | "noon" | "evening" | "lateNight";

interface EditFoodModalProps {
  food: any; // FoodEntry type
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditFoodModal({ food, onClose, onSuccess }: EditFoodModalProps) {
  const [foodName, setFoodName] = useState(food.foodName);
  const [calories, setCalories] = useState(food.calories.toString());
  const [protein, setProtein] = useState(food.protein.toString());
  const [carbs, setCarbs] = useState(food.carbs.toString());
  const [fats, setFats] = useState(food.fats.toString());
  const [quantity, setQuantity] = useState(food.quantity?.toString() || "1");
  const [unit, setUnit] = useState(food.unit || "serving");
  const [mealTime, setMealTime] = useState<MealTime>(food.mealTime as MealTime);

  const updateFoodMutation = trpc.food.updateFood.useMutation({
    onSuccess: () => {
      toast.success("Food entry updated successfully!");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update food entry");
    },
  });

  const handleSave = () => {
    if (!foodName.trim()) {
      toast.error("Please enter a food name");
      return;
    }

    const cal = parseFloat(calories);
    const prot = parseFloat(protein);
    const carb = parseFloat(carbs);
    const fat = parseFloat(fats);
    const qty = parseFloat(quantity);

    if (isNaN(cal) || isNaN(prot) || isNaN(carb) || isNaN(fat) || isNaN(qty)) {
      toast.error("Please enter valid numbers for all fields");
      return;
    }

    updateFoodMutation.mutate({
      id: food.id,
      data: {
        foodName: foodName.trim(),
        calories: Math.round(cal),
        protein: prot,
        carbs: carb,
        fats: fat,
        quantity: qty,
        unit,
        mealTime,
      },
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Food Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="foodName">Food Name</Label>
            <Input
              id="foodName"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="e.g., Chicken Breast"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., grams"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="mealTime">Meal Time</Label>
            <Select value={mealTime} onValueChange={(value: any) => setMealTime(value)}>
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

          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm mb-3">Macros</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="calories">Calories</Label>
                <Input
                  id="calories"
                  type="number"
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
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="carbs">Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  step="0.1"
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
                  value={fats}
                  onChange={(e) => setFats(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="flex-1"
              disabled={updateFoodMutation.isPending}
            >
              {updateFoodMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
