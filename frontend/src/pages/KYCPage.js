import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { Shield, CreditCard, MapPin, CheckCircle, Loader2, FileText } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function KYCPage() {
  const { t } = useLanguage();
  const { user, updateUser, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    id_type: 'id_card',
    id_number: '',
    iban: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'FR'
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/kyc/submit`, formData, { withCredentials: true });
      updateUser({ kyc_status: 'verified' });
      toast.success('Vérification KYC réussie !');
      navigate('/dashboard');
    } catch (error) {
      console.error('KYC error:', error);
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center py-12 px-4">
        <Loader2 className="w-10 h-10 text-[#2E5C55] animate-spin" />
      </div>
    );
  }

  if (user?.kyc_status === 'verified') {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('kyc.status_verified')}</h2>
          <p className="text-gray-600 mb-6">Votre identité a été vérifiée avec succès.</p>
          <Button
            onClick={() => navigate('/dashboard')}
            className="bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-full px-8"
            data-testid="kyc-go-dashboard-btn"
          >
            Accéder au tableau de bord
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#2E5C55]/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-[#2E5C55]" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('kyc.title')}</h1>
            <p className="text-gray-600">{t('kyc.subtitle')}</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s ? 'bg-[#2E5C55] text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 ${step > s ? 'bg-[#2E5C55]' : 'bg-gray-200'}`}></div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Identity Document */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <FileText className="w-6 h-6 text-[#2E5C55]" />
                    <h2 className="text-xl font-semibold text-gray-900">Document d'identité</h2>
                  </div>

                  <div>
                    <Label className="text-gray-700">{t('kyc.id_type')}</Label>
                    <Select
                      value={formData.id_type}
                      onValueChange={(value) => setFormData({ ...formData, id_type: value })}
                    >
                      <SelectTrigger className="mt-2 h-12" data-testid="kyc-id-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id_card">{t('kyc.id_card')}</SelectItem>
                        <SelectItem value="passport">{t('kyc.passport')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-700">{t('kyc.id_number')}</Label>
                    <Input
                      value={formData.id_number}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                      placeholder="123456789"
                      className="mt-2 h-12 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55]"
                      required
                      data-testid="kyc-id-number-input"
                    />
                  </div>

                  <div className="bg-[#F9FAFB] rounded-xl p-6 border-2 border-dashed border-gray-300 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">Téléchargez votre document (simulé)</p>
                    <p className="text-sm text-gray-400">Pour le MVP, la vérification est automatique</p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full h-12 bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-lg"
                    disabled={!formData.id_number}
                    data-testid="kyc-step1-next-btn"
                  >
                    {t('common.next')}
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Bank Details */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <CreditCard className="w-6 h-6 text-[#2E5C55]" />
                    <h2 className="text-xl font-semibold text-gray-900">Coordonnées bancaires</h2>
                  </div>

                  <div>
                    <Label className="text-gray-700">{t('kyc.iban')}</Label>
                    <Input
                      value={formData.iban}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                      placeholder="FR76 1234 5678 9012 3456 7890 123"
                      className="mt-2 h-12 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55] font-mono"
                      required
                      data-testid="kyc-iban-input"
                    />
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      Votre IBAN est utilisé uniquement pour les prélèvements SEPA automatiques. 
                      Vos données sont sécurisées et cryptées.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      onClick={() => setStep(1)}
                      variant="outline"
                      className="flex-1 h-12 rounded-lg"
                      data-testid="kyc-step2-back-btn"
                    >
                      {t('common.back')}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex-1 h-12 bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-lg"
                      disabled={!formData.iban}
                      data-testid="kyc-step2-next-btn"
                    >
                      {t('common.next')}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Address */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin className="w-6 h-6 text-[#2E5C55]" />
                    <h2 className="text-xl font-semibold text-gray-900">Adresse</h2>
                  </div>

                  <div>
                    <Label className="text-gray-700">{t('kyc.address')}</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Rue de la Paix"
                      className="mt-2 h-12 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55]"
                      required
                      data-testid="kyc-address-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700">{t('kyc.city')}</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Paris"
                        className="mt-2 h-12 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55]"
                        required
                        data-testid="kyc-city-input"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">{t('kyc.postal_code')}</Label>
                      <Input
                        value={formData.postal_code}
                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                        placeholder="75001"
                        className="mt-2 h-12 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55]"
                        required
                        data-testid="kyc-postal-input"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-700">{t('kyc.country')}</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => setFormData({ ...formData, country: value })}
                    >
                      <SelectTrigger className="mt-2 h-12" data-testid="kyc-country-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FR">France</SelectItem>
                        <SelectItem value="BE">Belgique</SelectItem>
                        <SelectItem value="CH">Suisse</SelectItem>
                        <SelectItem value="LU">Luxembourg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      onClick={() => setStep(2)}
                      variant="outline"
                      className="flex-1 h-12 rounded-lg"
                      data-testid="kyc-step3-back-btn"
                    >
                      {t('common.back')}
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || !formData.address || !formData.city || !formData.postal_code}
                      className="flex-1 h-12 bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-lg"
                      data-testid="kyc-submit-btn"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        t('kyc.submit')
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
