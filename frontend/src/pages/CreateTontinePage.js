import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Slider } from '../components/ui/slider';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Users, 
  Euro, 
  Calendar as CalendarIcon, 
  Shield,
  Shuffle,
  Gavel,
  ListOrdered,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  Share2
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StepIndicator = ({ currentStep, totalSteps }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {[...Array(totalSteps)].map((_, i) => (
      <div key={i} className="flex items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
          i + 1 <= currentStep ? 'bg-[#2E5C55] text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          {i + 1 <= currentStep && currentStep > i + 1 ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            i + 1
          )}
        </div>
        {i < totalSteps - 1 && (
          <div className={`w-12 h-1 mx-1 transition-colors ${
            i + 1 < currentStep ? 'bg-[#2E5C55]' : 'bg-gray-200'
          }`}></div>
        )}
      </div>
    ))}
  </div>
);

export default function CreateTontinePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdTontine, setCreatedTontine] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monthly_amount: 100,
    max_participants: 6,
    duration_months: 6,
    start_date: null,
    attribution_mode: 'fixed',
    min_trust_score: 30
  });

  const handleSubmit = async () => {
    if (!formData.start_date) {
      toast.error('Veuillez sélectionner une date de début');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        start_date: format(formData.start_date, 'yyyy-MM-dd')
      };
      const response = await axios.post(`${API}/tontines`, payload, { withCredentials: true });
      toast.success('Tontine creee avec succes !');
      setCreatedTontine(response.data);
      setStep(4); // Show share step
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const attributionModes = [
    { value: 'fixed', label: t('tontine.mode_fixed'), icon: ListOrdered, description: 'Les participants reçoivent dans l\'ordre d\'inscription.' },
    { value: 'random', label: t('tontine.mode_random'), icon: Shuffle, description: 'L\'ordre est déterminé par tirage au sort.' },
    { value: 'auction', label: t('tontine.mode_auction'), icon: Gavel, description: 'Les participants peuvent enchérir pour leur tour.' }
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('tontine.create_title')}</h1>
            <p className="text-gray-600">Configurez les paramètres de votre nouvelle tontine.</p>
          </div>

          <StepIndicator currentStep={step} totalSteps={4} />

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Informations générales</h2>

                <div>
                  <Label className="text-gray-700">{t('tontine.name')}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ma Tontine 2025"
                    className="mt-2 h-12 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55]"
                    required
                    data-testid="create-name-input"
                  />
                </div>

                <div>
                  <Label className="text-gray-700">{t('tontine.description')}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description de la tontine (optionnel)"
                    className="mt-2 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55] min-h-[100px]"
                    data-testid="create-description-input"
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full h-12 bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-lg"
                  disabled={!formData.name}
                  data-testid="create-step1-next"
                >
                  {t('common.next')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: Financial Settings */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Paramètres financiers</h2>

                <div>
                  <Label className="text-gray-700">{t('tontine.monthly_amount')}</Label>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold text-[#2E5C55]">{formData.monthly_amount}€</span>
                      <span className="text-gray-500">par mois</span>
                    </div>
                    <Slider
                      value={[formData.monthly_amount]}
                      onValueChange={(value) => setFormData({ ...formData, monthly_amount: value[0] })}
                      min={50}
                      max={1000}
                      step={50}
                      className="w-full"
                      data-testid="create-amount-slider"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>50€</span>
                      <span>1000€</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-700">{t('tontine.max_participants')}</Label>
                    <Select
                      value={formData.max_participants.toString()}
                      onValueChange={(value) => setFormData({ ...formData, max_participants: parseInt(value), duration_months: parseInt(value) })}
                    >
                      <SelectTrigger className="mt-2 h-12" data-testid="create-participants-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[4, 5, 6, 7, 8, 10, 12].map((n) => (
                          <SelectItem key={n} value={n.toString()}>{n} participants</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-700">{t('tontine.duration')}</Label>
                    <Select
                      value={formData.duration_months.toString()}
                      onValueChange={(value) => setFormData({ ...formData, duration_months: parseInt(value) })}
                    >
                      <SelectTrigger className="mt-2 h-12" data-testid="create-duration-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[4, 5, 6, 7, 8, 10, 12].map((n) => (
                          <SelectItem key={n} value={n.toString()}>{n} mois</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-[#F9FAFB] rounded-xl p-4">
                  <p className="text-sm text-gray-600">
                    <strong>Total par tour :</strong> {formData.monthly_amount * formData.max_participants}€
                    <br />
                    <span className="text-gray-500">
                      (Frais de garantie de 3% : {(formData.monthly_amount * 0.03).toFixed(2)}€/mois)
                    </span>
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1 h-12 rounded-lg"
                    data-testid="create-step2-back"
                  >
                    <ArrowLeft className="mr-2 w-5 h-5" />
                    {t('common.back')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 h-12 bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-lg"
                    data-testid="create-step2-next"
                  >
                    {t('common.next')}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Attribution Mode */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Mode d'attribution</h2>

                <div className="space-y-4">
                  {attributionModes.map((mode) => (
                    <div
                      key={mode.value}
                      onClick={() => setFormData({ ...formData, attribution_mode: mode.value })}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.attribution_mode === mode.value
                          ? 'border-[#2E5C55] bg-[#2E5C55]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      data-testid={`create-mode-${mode.value}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          formData.attribution_mode === mode.value ? 'bg-[#2E5C55] text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <mode.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{mode.label}</h3>
                          <p className="text-sm text-gray-500 mt-1">{mode.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <Label className="text-gray-700">{t('tontine.min_trust_score')}</Label>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-[#2E5C55]">{formData.min_trust_score}</span>
                      <span className="text-gray-500">score minimum</span>
                    </div>
                    <Slider
                      value={[formData.min_trust_score]}
                      onValueChange={(value) => setFormData({ ...formData, min_trust_score: value[0] })}
                      min={0}
                      max={80}
                      step={10}
                      className="w-full"
                      data-testid="create-score-slider"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    variant="outline"
                    className="flex-1 h-12 rounded-lg"
                    data-testid="create-step3-back"
                  >
                    <ArrowLeft className="mr-2 w-5 h-5" />
                    {t('common.back')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(4)}
                    className="flex-1 h-12 bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-lg"
                    data-testid="create-step3-next"
                  >
                    {t('common.next')}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Start Date & Confirmation */}
            {step === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Date de début</h2>

                <div>
                  <Label className="text-gray-700">{t('tontine.start_date')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full mt-2 h-12 justify-start text-left font-normal"
                        data-testid="create-date-btn"
                      >
                        <CalendarIcon className="mr-2 h-5 w-5 text-gray-500" />
                        {formData.start_date ? (
                          format(formData.start_date, 'dd MMMM yyyy', { locale: fr })
                        ) : (
                          <span className="text-gray-500">Sélectionner une date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.start_date}
                        onSelect={(date) => setFormData({ ...formData, start_date: date })}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Summary */}
                <div className="bg-[#F9FAFB] rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">Récapitulatif</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Nom</p>
                      <p className="font-medium text-gray-900">{formData.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Montant mensuel</p>
                      <p className="font-medium text-gray-900">{formData.monthly_amount}€</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Participants</p>
                      <p className="font-medium text-gray-900">{formData.max_participants}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Durée</p>
                      <p className="font-medium text-gray-900">{formData.duration_months} mois</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Mode</p>
                      <p className="font-medium text-gray-900">{
                        attributionModes.find(m => m.value === formData.attribution_mode)?.label
                      }</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Score minimum</p>
                      <p className="font-medium text-gray-900">{formData.min_trust_score}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-gray-500">Total par tour</p>
                    <p className="text-2xl font-bold text-[#2E5C55]">
                      {formData.monthly_amount * formData.max_participants}€
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    variant="outline"
                    className="flex-1 h-12 rounded-lg"
                    data-testid="create-step4-back"
                  >
                    <ArrowLeft className="mr-2 w-5 h-5" />
                    {t('common.back')}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || !formData.start_date}
                    className="flex-1 h-12 bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-lg"
                    data-testid="create-submit-btn"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {t('tontine.create_btn')}
                        <CheckCircle className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4 - Share */}
            {step === 4 && createdTontine && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Tontine creee !</h2>
                <p className="text-gray-600 mb-6">Partagez le lien pour inviter des participants :</p>

                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-3 border mb-6">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/tontines/${createdTontine.tontine_id}`}
                    className="flex-1 text-sm text-gray-600 bg-transparent outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/tontines/${createdTontine.tontine_id}`);
                      toast.success('Lien copie !');
                    }}
                    className="p-2 hover:bg-gray-200 rounded-md text-gray-500"
                    data-testid="create-copy-link"
                  >
                    Copier
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <Button
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Rejoignez ma tontine "${formData.name}" sur Savyn ! ${formData.monthly_amount}EUR/mois. ${window.location.origin}/tontines/${createdTontine.tontine_id}`)}`, '_blank')}
                    className="bg-[#25D366] hover:bg-[#1fb855] text-white rounded-lg"
                    data-testid="create-share-whatsapp"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    onClick={() => window.open(`mailto:?subject=${encodeURIComponent(`Invitation - Tontine "${formData.name}" sur Savyn`)}&body=${encodeURIComponent(`Bonjour,\n\nJe vous invite a rejoindre ma tontine "${formData.name}" sur Savyn.\nMontant: ${formData.monthly_amount}EUR/mois\n\n${window.location.origin}/tontines/${createdTontine.tontine_id}`)}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    data-testid="create-share-email"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    onClick={() => window.open(`sms:?body=${encodeURIComponent(`Rejoignez ma tontine "${formData.name}" sur Savyn ! ${window.location.origin}/tontines/${createdTontine.tontine_id}`)}`)}
                    className="bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                    data-testid="create-share-sms"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    SMS
                  </Button>
                </div>

                <Button
                  onClick={() => navigate(`/tontines/${createdTontine.tontine_id}`)}
                  className="bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-full px-8"
                  data-testid="create-go-to-tontine"
                >
                  Voir la tontine
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
