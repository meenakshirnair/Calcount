import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle, Copy } from "lucide-react";
import { toast } from "sonner";

interface BMICalculatorProps {
  onCalculate: (data: {
    height: number;
    weight: number;
    age: number;
    gender: "male" | "female" | "other";
    activityLevel: "sedentary" | "light" | "moderate" | "active" | "veryActive";
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs: number;
    dailyFats: number;
  }) => void;
  onApplyGoals?: (data: any) => void;
  initialData?: {
    height?: number;
    weight?: number;
    age?: number;
    gender?: "male" | "female" | "other";
    activityLevel?: "sedentary" | "light" | "moderate" | "active" | "veryActive";
  };
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

const ACTIVITY_DESCRIPTIONS: Record<string, string> = {
  sedentary: "Little or no exercise",
  light: "Light exercise 1-3 days/week",
  moderate: "Moderate exercise 3-5 days/week",
  active: "Hard exercise 6-7 days/week",
  veryActive: "Very hard exercise or physical job",
};

const calculateMacros = (calories: number, goal: string) => {
  let proteinRatio = 0.3;
  let carbRatio = 0.45;
  let fatRatio = 0.25;

  if (goal === "lose") {
    proteinRatio = 0.35;
    carbRatio = 0.4;
    fatRatio = 0.25;
  } else if (goal === "gain") {
    proteinRatio = 0.3;
    carbRatio = 0.5;
    fatRatio = 0.2;
  }

  return {
    protein: Math.round((calories * proteinRatio) / 4),
    carbs: Math.round((calories * carbRatio) / 4),
    fats: Math.round((calories * fatRatio) / 9),
  };
};

export default function BMICalculator({ onCalculate, onApplyGoals, initialData }: BMICalculatorProps) {
  const [height, setHeight] = useState(initialData?.height?.toString() || "");
  const [weight, setWeight] = useState(initialData?.weight?.toString() || "");
  const [age, setAge] = useState(initialData?.age?.toString() || "");
  const [gender, setGender] = useState(initialData?.gender || "male");
  const [activityLevel, setActivityLevel] = useState(initialData?.activityLevel || "moderate");
  const [goal, setGoal] = useState<"maintain" | "lose" | "gain">("maintain");
  const [bmi, setBmi] = useState<number | null>(null);
  const [tdee, setTdee] = useState<number | null>(null);
  const [suggestedMacros, setSuggestedMacros] = useState<any>(null);

  const calculateBMI = () => {
    if (!height || !weight || !age) {
      alert("Please fill in all fields");
      return;
    }

    const h = parseFloat(height);
    const w = parseFloat(weight);
    const a = parseInt(age);

    if (h <= 0 || w <= 0 || a <= 0) {
      alert("Please enter valid positive numbers");
      return;
    }

    const heightInMeters = h / 100;
    const bmiValue = w / (heightInMeters * heightInMeters);
    setBmi(parseFloat(bmiValue.toFixed(1)));

    let bmr: number;
    if (gender === "male") {
      bmr = 10 * w + 6.25 * h - 5 * a + 5;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * a - 161;
    }

    const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.55;
    let tdeeValue = bmr * multiplier;

    let adjustedCalories = tdeeValue;
    if (goal === "lose") {
      adjustedCalories = tdeeValue * 0.85;
    } else if (goal === "gain") {
      adjustedCalories = tdeeValue * 1.1;
    }

    setTdee(parseFloat(adjustedCalories.toFixed(0)));

    const macros = calculateMacros(adjustedCalories, goal);
    setSuggestedMacros(macros);

    onCalculate({
      height: h,
      weight: w,
      age: a,
      gender: gender as "male" | "female" | "other",
      activityLevel: activityLevel as "sedentary" | "light" | "moderate" | "active" | "veryActive",
      dailyCalories: Math.round(adjustedCalories),
      dailyProtein: macros.protein,
      dailyCarbs: macros.carbs,
      dailyFats: macros.fats,
    });
  };

  const getBMICategory = (bmiValue: number) => {
    if (bmiValue < 18.5) return { category: "Underweight", color: "text-blue-600" };
    if (bmiValue < 25) return { category: "Normal weight", color: "text-green-600" };
    if (bmiValue < 30) return { category: "Overweight", color: "text-yellow-600" };
    return { category: "Obese", color: "text-red-600" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>BMI Calculator & Nutrition Planner</CardTitle>
        <CardDescription>Calculate your BMI and get personalized macro recommendations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="height">Height (cm)</Label>
            <Input
              id="height"
              type="number"
              placeholder="170"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              placeholder="70"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="age">Age (years)</Label>
            <Input
              id="age"
              type="number"
              placeholder="25"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select value={gender} onValueChange={(value: any) => setGender(value)}>
              <SelectTrigger id="gender">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="activity">Activity Level</Label>
          <Select value={activityLevel} onValueChange={(value: any) => setActivityLevel(value)}>
            <SelectTrigger id="activity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sedentary">Sedentary - {ACTIVITY_DESCRIPTIONS.sedentary}</SelectItem>
              <SelectItem value="light">Light - {ACTIVITY_DESCRIPTIONS.light}</SelectItem>
              <SelectItem value="moderate">Moderate - {ACTIVITY_DESCRIPTIONS.moderate}</SelectItem>
              <SelectItem value="active">Active - {ACTIVITY_DESCRIPTIONS.active}</SelectItem>
              <SelectItem value="veryActive">Very Active - {ACTIVITY_DESCRIPTIONS.veryActive}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="goal">Goal</Label>
          <Select value={goal} onValueChange={(value: any) => setGoal(value)}>
            <SelectTrigger id="goal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="maintain">Maintain Weight</SelectItem>
              <SelectItem value="lose">Lose Weight (15% deficit)</SelectItem>
              <SelectItem value="gain">Gain Weight (10% surplus)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={calculateBMI} className="w-full">
          Calculate
        </Button>

        {bmi !== null && (
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <div className="text-sm text-slate-600 mb-1">BMI</div>
              <div className={`text-3xl font-bold ${getBMICategory(bmi).color}`}>
                {bmi}
              </div>
              <div className={`text-sm font-medium ${getBMICategory(bmi).color}`}>
                {getBMICategory(bmi).category}
              </div>
            </div>

            {tdee !== null && suggestedMacros && (
              <div className="border-t border-slate-200 pt-4">
                <div className="text-sm text-slate-600 mb-2">Estimated Daily Calorie Needs (TDEE)</div>
                <div className="text-3xl font-bold text-slate-900">{tdee}</div>
                <p className="text-xs text-slate-500 mt-2 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Based on your activity level and {goal} goal
                </p>

                <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h5 className="font-semibold text-sm text-blue-900 mb-3">Suggested Daily Macros</h5>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white p-3 rounded">
                      <div className="text-xs text-slate-600">Protein</div>
                      <div className="text-lg font-bold text-slate-900">{suggestedMacros.protein}g</div>
                    </div>
                    <div className="bg-white p-3 rounded">
                      <div className="text-xs text-slate-600">Carbs</div>
                      <div className="text-lg font-bold text-slate-900">{suggestedMacros.carbs}g</div>
                    </div>
                    <div className="bg-white p-3 rounded">
                      <div className="text-xs text-slate-600">Fats</div>
                      <div className="text-lg font-bold text-slate-900">{suggestedMacros.fats}g</div>
                    </div>
                  </div>
                </div>

                {onApplyGoals && (
                  <Button
                    onClick={() => {
                      onApplyGoals({
                        dailyCalories: tdee,
                        dailyProtein: suggestedMacros.protein,
                        dailyCarbs: suggestedMacros.carbs,
                        dailyFats: suggestedMacros.fats,
                      });
                      toast.success("Goals applied successfully!");
                    }}
                    className="w-full mt-4"
                    variant="default"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Apply as Daily Goal
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
