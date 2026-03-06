import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { 
  Shield, 
  Zap, 
  Eye, 
  Users, 
  CreditCard, 
  PiggyBank, 
  CheckCircle,
  ArrowRight,
  Star
} from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm card-hover"
  >
    <div className="w-14 h-14 rounded-xl bg-[#2E5C55]/10 flex items-center justify-center mb-5">
      <Icon className="w-7 h-7 text-[#2E5C55]" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </motion.div>
);

const StepCard = ({ number, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className="relative"
  >
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2E5C55] text-white flex items-center justify-center font-bold text-lg">
        {number}
      </div>
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  </motion.div>
);

export default function LandingPage() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden noise-texture">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F9FAFB] to-white"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-1 max-w-2xl"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2E5C55]/10 text-[#2E5C55] text-sm font-medium mb-6">
                <Shield className="w-4 h-4" />
                Plateforme sécurisée & régulée
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                {t('landing.hero_title')}
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                {t('landing.hero_subtitle')}
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={handleGetStarted}
                  className="bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-full px-8 py-6 text-lg font-semibold shadow-lg btn-press"
                  data-testid="get-started-btn"
                >
                  {t('landing.cta_start')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  variant="outline"
                  className="rounded-full px-8 py-6 text-lg border-gray-300 hover:bg-gray-50"
                  onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
                  data-testid="learn-more-btn"
                >
                  {t('landing.cta_learn')}
                </Button>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1 max-w-xl"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-tr from-[#2E5C55]/20 to-[#D4A373]/20 rounded-3xl blur-2xl"></div>
                <img 
                  src="https://images.unsplash.com/photo-1758270705641-acf09b68a91f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwzfHxkaXZlcnNlJTIwZnJpZW5kcyUyMHNtaWxpbmclMjBjb21tdW5pdHl8ZW58MHx8fHwxNzcyNzg2NzUyfDA&ixlib=rb-4.1.0&q=85"
                  alt="Community"
                  className="relative rounded-2xl shadow-2xl w-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[#2E5C55]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <p className="text-4xl font-bold text-white mb-2">5,000+</p>
              <p className="text-[#D4A373] font-medium">{t('landing.stats_users')}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <p className="text-4xl font-bold text-white mb-2">250+</p>
              <p className="text-[#D4A373] font-medium">{t('landing.stats_tontines')}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <p className="text-4xl font-bold text-white mb-2">€2.5M+</p>
              <p className="text-[#D4A373] font-medium">{t('landing.stats_volume')}</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[#F9FAFB]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
            >
              Pourquoi choisir Tontine ?
            </motion.h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Shield}
              title={t('landing.feature1_title')}
              description={t('landing.feature1_desc')}
              delay={0}
            />
            <FeatureCard 
              icon={Zap}
              title={t('landing.feature2_title')}
              description={t('landing.feature2_desc')}
              delay={0.1}
            />
            <FeatureCard 
              icon={Eye}
              title={t('landing.feature3_title')}
              description={t('landing.feature3_desc')}
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12"
              >
                {t('landing.how_it_works')}
              </motion.h2>
              <div className="space-y-10">
                <StepCard number="1" title={t('landing.step1_title')} description={t('landing.step1_desc')} delay={0} />
                <StepCard number="2" title={t('landing.step2_title')} description={t('landing.step2_desc')} delay={0.1} />
                <StepCard number="3" title={t('landing.step3_title')} description={t('landing.step3_desc')} delay={0.2} />
                <StepCard number="4" title={t('landing.step4_title')} description={t('landing.step4_desc')} delay={0.3} />
              </div>
            </div>
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="flex-1 max-w-md"
            >
              <img 
                src="https://images.unsplash.com/photo-1579621970343-21c491b3f363?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwxfHxncm93aW5nJTIwcGxhbnQlMjBtb25leSUyMGNvbmNlcHR8ZW58MHx8fHwxNzcyNzg2NzUzfDA&ixlib=rb-4.1.0&q=85"
                alt="Growth"
                className="rounded-2xl shadow-xl w-full"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 bg-[#F9FAFB]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="flex-1 max-w-md"
            >
              <img 
                src="https://images.unsplash.com/photo-1696013910376-c56f76dd8178?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwc2VjdXJpdHklMjBwYWRsb2NrJTIwaWNvbnxlbnwwfHx8fDE3NzI3ODY3Njl8MA&ixlib=rb-4.1.0&q=85"
                alt="Security"
                className="rounded-2xl shadow-xl w-full"
              />
            </motion.div>
            <div className="flex-1">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8"
              >
                Votre argent est protégé
              </motion.h2>
              <div className="space-y-6">
                {[
                  { icon: CheckCircle, text: 'Fonds détenus par un prestataire agréé' },
                  { icon: Users, text: 'Vérification KYC obligatoire' },
                  { icon: CreditCard, text: 'Prélèvements SEPA automatiques' },
                  { icon: PiggyBank, text: 'Fonds de garantie (3% par contribution)' }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#2E5C55]/10 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-[#2E5C55]" />
                    </div>
                    <p className="text-gray-700 font-medium">{item.text}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center"
          >
            {t('landing.testimonial_title')}
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: 'Marie L.',
                role: 'Membre depuis 2024',
                text: "Grâce à Tontine, j'ai pu financer ma nouvelle voiture. Le système est simple et fiable.",
                rating: 5
              },
              {
                name: 'Ahmed K.',
                role: 'Membre depuis 2023',
                text: "Enfin une plateforme qui modernise la tontine traditionnelle. Tout est transparent.",
                rating: 5
              },
              {
                name: 'Sophie M.',
                role: 'Membre depuis 2024',
                text: "Les prélèvements automatiques simplifient tout. Plus besoin de courir après les paiements.",
                rating: 5
              }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-[#D4A373] text-[#D4A373]" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#2E5C55]/10 flex items-center justify-center">
                    <span className="text-[#2E5C55] font-semibold">{testimonial.name[0]}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#2E5C55]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-white mb-6"
          >
            Prêt à commencer votre épargne collective ?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-xl text-white/80 mb-8"
          >
            Rejoignez des milliers de membres qui épargnent ensemble.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Button 
              onClick={handleGetStarted}
              className="bg-white text-[#2E5C55] hover:bg-gray-100 rounded-full px-10 py-6 text-lg font-semibold shadow-lg btn-press"
              data-testid="cta-get-started-btn"
            >
              {t('landing.cta_start')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
