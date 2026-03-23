/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shirt, 
  Layers, 
  Footprints, 
  Sparkles, 
  RotateCcw, 
  Download,
  User as UserIcon,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { ImageUpload } from './components/ImageUpload';
import { tryOnClothing } from './services/gemini';
import { getImageDimensions, resizeImage, cropToAspectRatio, getClosestAspectRatio } from './utils/imageProcess';

// Sample data
const SAMPLE_MODELS = [
  { id: 'm1', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80', label: 'Casual Male' },
  { id: 'm2', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80', label: 'Casual Female' },
  { id: 'm3', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80', label: 'Professional Male' },
];

const SAMPLE_CLOTHES = {
  top: [
    { id: 't1', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80', label: 'White Tee' },
    { id: 't2', url: 'https://images.unsplash.com/photo-1598033129183-c4f50c7176c8?auto=format&fit=crop&w=400&q=80', label: 'Black Shirt' },
  ],
  bottom: [
    { id: 'b1', url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=400&q=80', label: 'Blue Jeans' },
    { id: 'b2', url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=400&q=80', label: 'Black Trousers' },
  ],
  shoes: [
    { id: 's1', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80', label: 'Red Sneakers' },
    { id: 's2', url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=80', label: 'Brown Boots' },
  ]
};

type ClothingType = 'top' | 'bottom' | 'shoes';

export default function App() {
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [clothingImages, setClothingImages] = useState<Partial<Record<ClothingType, string>>>({});
  const [selectedTypes, setSelectedTypes] = useState<ClothingType[]>(['top']);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'samples'>('samples');
  const [aspectRatio, setAspectRatio] = useState<string>("Auto");

  const handleTryOn = async () => {
    if (!personImage) return;
    
    const itemsToTry = selectedTypes
      .filter(type => clothingImages[type])
      .map(type => ({ type, base64: clothingImages[type]! }));

    if (itemsToTry.length === 0) return;
    
    setIsProcessing(true);
    setError(null);
    try {
      // 1. Determine target aspect ratio
      let targetRatio = aspectRatio;
      const { width, height } = await getImageDimensions(personImage);
      
      if (aspectRatio === "Auto") {
        targetRatio = getClosestAspectRatio(width, height);
      }

      // 2. Crop person image to target aspect ratio to avoid distortion
      const croppedPerson = await cropToAspectRatio(personImage, targetRatio);
      
      // 3. Call Gemini for try-on
      const result = await tryOnClothing(croppedPerson, itemsToTry, targetRatio);
      
      if (result) {
        // 4. Set result directly (already in target aspect ratio)
        setResultImage(result);
      } else {
        setError("Failed to generate image. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleType = (type: ClothingType) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };

  const setClothingImage = (type: ClothingType, url: string | null) => {
    setClothingImages(prev => ({
      ...prev,
      [type]: url || undefined
    }));
  };

  const reset = () => {
    setResultImage(null);
    setClothingImages({});
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar - Controls */}
      <aside className="w-full md:w-80 lg:w-96 bg-white border-r border-zinc-200 flex flex-col h-screen overflow-y-auto">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">AI Dressing Room</h1>
          </div>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Virtual Try-On Studio</p>
        </div>

        <div className="p-6 space-y-8">
          {/* Step 1: Person */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <UserIcon className="w-4 h-4" /> 1. Select Person
              </h2>
              <div className="flex gap-1 bg-zinc-100 p-1 rounded-lg">
                <button 
                  onClick={() => setActiveTab('samples')}
                  className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${activeTab === 'samples' ? 'bg-white shadow-sm' : 'text-zinc-500'}`}
                >
                  Samples
                </button>
                <button 
                  onClick={() => setActiveTab('upload')}
                  className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${activeTab === 'upload' ? 'bg-white shadow-sm' : 'text-zinc-500'}`}
                >
                  Upload
                </button>
              </div>
            </div>

            {activeTab === 'samples' ? (
              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setPersonImage(model.url)}
                    className={`aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${personImage === model.url ? 'border-zinc-900 ring-2 ring-zinc-900/10' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <img src={model.url} alt={model.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            ) : (
              <ImageUpload 
                label="Your Photo" 
                onUpload={setPersonImage} 
                currentImage={personImage}
                onClear={() => setPersonImage(null)}
              />
            )}
          </section>

          {/* Step 2: Clothing Type */}
          <section>
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4" /> 2. Clothing Types (Multiple)
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(['top', 'bottom', 'shoes'] as ClothingType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedTypes.includes(type) ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}
                >
                  {type === 'top' && <Shirt className="w-5 h-5 mb-1" />}
                  {type === 'bottom' && <Layers className="w-5 h-5 mb-1" />}
                  {type === 'shoes' && <Footprints className="w-5 h-5 mb-1" />}
                  <span className="text-[10px] font-bold uppercase tracking-wider">{type}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Step 3: Clothing Items */}
          <section className="space-y-6">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Shirt className="w-4 h-4" /> 3. Select Items
            </h2>
            
            {selectedTypes.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">Please select at least one clothing type in Step 2.</p>
            ) : (
              selectedTypes.map(type => (
                <div key={type} className="p-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center">
                      {type === 'top' && <Shirt className="w-3 h-3 text-zinc-600" />}
                      {type === 'bottom' && <Layers className="w-3 h-3 text-zinc-600" />}
                      {type === 'shoes' && <Footprints className="w-3 h-3 text-zinc-600" />}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-600">{type}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {SAMPLE_CLOTHES[type].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setClothingImage(type, item.url)}
                        className={`aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${clothingImages[type] === item.url ? 'border-zinc-900' : 'border-transparent opacity-70 hover:opacity-100'}`}
                      >
                        <img src={item.url} alt={item.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>

                  <ImageUpload 
                    label={`Upload ${type}`} 
                    onUpload={(url) => setClothingImage(type, url)} 
                    currentImage={clothingImages[type]}
                    onClear={() => setClothingImage(type, null)}
                    className="mt-2"
                  />
                </div>
              ))
            )}
          </section>

          {/* Step 4: Aspect Ratio */}
          <section>
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4" /> 4. Aspect Ratio
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {["Auto", "1:1", "3:4", "4:3", "9:16", "16:9"].map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`py-2 px-1 rounded-lg border text-[10px] font-bold transition-all ${aspectRatio === ratio ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-auto p-6 bg-zinc-50 border-t border-zinc-200 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
              {error}
            </div>
          )}
          <button
            disabled={!personImage || Object.keys(clothingImages).length === 0 || isProcessing}
            onClick={handleTryOn}
            className="w-full py-4 bg-zinc-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Try It On ({Object.keys(clothingImages).length} items)
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content - Preview */}
      <main className="flex-1 bg-zinc-100 p-4 md:p-8 lg:p-12 flex items-center justify-center overflow-hidden">
        <div className="max-w-4xl w-full h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
                <span>Preview</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-zinc-900">{resultImage ? 'Result' : 'Original'}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-zinc-500">{aspectRatio}</span>
              </div>
            </div>
            {resultImage && (
              <div className="flex gap-2">
                <button 
                  onClick={reset}
                  className="p-2 bg-white rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-all"
                  title="Reset"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    if (resultImage) {
                      const link = document.createElement('a');
                      link.href = resultImage;
                      link.download = `try-on-${Date.now()}.png`;
                      link.click();
                    }
                  }}
                  className="px-4 py-2 bg-white rounded-lg border border-zinc-200 text-zinc-900 font-semibold flex items-center gap-2 hover:bg-zinc-50 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Save Image
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 relative rounded-3xl overflow-hidden bg-white shadow-2xl border border-zinc-200 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center"
                >
                  <div className="relative mb-8">
                    <div className="w-24 h-24 border-4 border-zinc-100 rounded-full" />
                    <div className="absolute inset-0 w-24 h-24 border-4 border-t-zinc-900 rounded-full animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-zinc-900" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">AI is tailoring your look</h3>
                  <p className="text-zinc-500 max-w-xs">We're analyzing the clothing texture and fitting it perfectly to the model's pose.</p>
                </motion.div>
              ) : null}

              <motion.div 
                key={resultImage || personImage || 'empty'}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="w-full h-full flex items-center justify-center p-4"
              >
                {resultImage ? (
                  <img 
                    src={resultImage} 
                    alt="Result" 
                    className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : personImage ? (
                  <div className="relative group">
                    <img 
                      src={personImage} 
                      alt="Model" 
                      className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl" />
                  </div>
                ) : (
                  <div className="text-center p-12">
                    <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-100">
                      <UserIcon className="w-10 h-10 text-zinc-300" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Ready to start?</h3>
                    <p className="text-zinc-500 max-w-xs mx-auto">Select a model from the sidebar or upload your own photo to begin the virtual try-on experience.</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-8 text-zinc-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-[10px] font-bold uppercase tracking-widest">AI Engine Active</span>
            </div>
            <div className="w-px h-4 bg-zinc-200" />
            <div className="text-[10px] font-bold uppercase tracking-widest">Powered by Gemini 2.5 Flash Image</div>
          </div>
        </div>
      </main>

      {/* API Key Selection Overlay */}
      <AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
