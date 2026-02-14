import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

type MealTime = "morning" | "noon" | "evening" | "lateNight";

interface ImageUploadModalProps {
  mealTime: MealTime;
  date: Date;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImageUploadModal({ mealTime, date, onClose, onSuccess }: ImageUploadModalProps) {
  const [selectedMealTime, setSelectedMealTime] = useState(mealTime);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImageMutation = trpc.food.uploadImage.useMutation();
  const analyzeImageMutation = trpc.food.analyzeImage.useMutation({
    onSuccess: () => {
      toast.success("Food entry added from image!");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to analyze image");
      setIsAnalyzing(false);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!preview) {
      toast.error("Please select an image first");
      return;
    }

    setIsAnalyzing(true);

    try {
      // Upload image first
      const base64Data = preview.split(",")[1];
      const uploadResult = await uploadImageMutation.mutateAsync({
        imageBase64: base64Data,
      });

      // Then analyze it
      await analyzeImageMutation.mutateAsync({
        imageUrl: uploadResult.url,
        mealTime: selectedMealTime,
        date,
      });
    } catch (error) {
      console.error("Error:", error);
      setIsAnalyzing(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Analyze Food Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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

          <div>
            <Label>Food Image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose Image
            </Button>
          </div>

          {preview && (
            <div className="relative w-full h-48 bg-slate-100 rounded-lg overflow-hidden">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isAnalyzing}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAnalyze}
              className="flex-1"
              disabled={!preview || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
