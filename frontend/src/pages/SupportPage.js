import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  MessageCircle, 
  Send, 
  HelpCircle,
  Loader2,
  Clock,
  CheckCircle
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FAQ_DATA = [
  {
    question: "Comment fonctionne une tontine ?",
    answer: "Une tontine est un système d'épargne collective où un groupe de personnes contribue mensuellement. Chaque mois, un membre reçoit la totalité des contributions. Chaque participant reçoit une fois pendant la durée de la tontine."
  },
  {
    question: "Comment est garantie la sécurité de mon argent ?",
    answer: "Vos fonds sont détenus par un prestataire de paiement agréé, jamais par notre plateforme. De plus, un fonds de garantie de 3% sur chaque contribution permet de couvrir d'éventuels défauts de paiement."
  },
  {
    question: "Que se passe-t-il si un membre ne paie pas ?",
    answer: "Le prélèvement SEPA automatique minimise ce risque. En cas de défaut, le fonds de garantie intervient pour assurer le paiement. Le membre défaillant voit son score de confiance diminuer drastiquement."
  },
  {
    question: "Comment est déterminé l'ordre de réception ?",
    answer: "L'ordre peut être fixe (ordre d'inscription), aléatoire (tirage au sort) ou par enchères, selon les paramètres choisis par le créateur de la tontine. Les nouveaux utilisateurs sont généralement placés en fin de cycle."
  },
  {
    question: "Puis-je quitter une tontine en cours ?",
    answer: "Non, une fois inscrit, vous êtes engagé jusqu'à la fin de la tontine. Un contrat digital est signé lors de l'inscription qui vous engage légalement à effectuer tous vos paiements."
  },
  {
    question: "Comment fonctionne le score de confiance ?",
    answer: "Votre score de confiance augmente avec vos paiements à temps, votre ancienneté et votre historique. Un score élevé vous donne accès à plus de tontines et vous place en priorité."
  }
];

export default function SupportPage() {
  const { t } = useLanguage();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general'
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await axios.get(`${API}/support/tickets`, { withCredentials: true });
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/support/tickets`, formData, { withCredentials: true });
      toast.success('Ticket créé avec succès');
      setFormData({ subject: '', message: '', category: 'general' });
      fetchTickets();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-8 px-4" data-testid="support-page">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 rounded-full bg-[#2E5C55]/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-[#2E5C55]" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('support.title')}</h1>
          <p className="text-gray-600">Comment pouvons-nous vous aider ?</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* New Ticket Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Send className="w-5 h-5 text-[#2E5C55]" />
                  {t('support.new_ticket')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label className="text-gray-700">{t('support.category')}</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="mt-2 h-12" data-testid="support-category-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">{t('support.cat_general')}</SelectItem>
                        <SelectItem value="payment">{t('support.cat_payment')}</SelectItem>
                        <SelectItem value="technical">{t('support.cat_technical')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-700">{t('support.subject')}</Label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Sujet de votre demande"
                      className="mt-2 h-12 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55]"
                      required
                      data-testid="support-subject-input"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-700">{t('support.message')}</Label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Décrivez votre problème ou question..."
                      className="mt-2 bg-gray-50 border-transparent focus:bg-white focus:border-[#2E5C55] min-h-[150px]"
                      required
                      data-testid="support-message-input"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 bg-[#2E5C55] hover:bg-[#254a44] text-white rounded-lg"
                    data-testid="support-submit-btn"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        {t('support.submit')}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Your Tickets */}
            <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  {t('support.your_tickets')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse"></div>
                    ))}
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Aucun ticket</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.ticket_id}
                        className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{ticket.subject}</h4>
                          <Badge
                            className={
                              ticket.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }
                          >
                            {ticket.status === 'open' ? t('support.status_open') : t('support.status_closed')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{ticket.message}</p>
                        <p className="text-xs text-gray-400">
                          {ticket.created_at ? format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : ''}
                        </p>
                        {ticket.admin_response && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-[#2E5C55]">
                              <strong>Réponse :</strong> {ticket.admin_response}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-[#D4A373]" />
                  {t('support.faq_title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {FAQ_DATA.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left hover:no-underline">
                        <span className="font-medium text-gray-900">{faq.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-600">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="bg-[#2E5C55] rounded-2xl border-0 shadow-sm mt-6 text-white">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Besoin d'une aide immédiate ?</h3>
                <p className="text-white/80 mb-4">
                  Notre équipe est disponible du lundi au vendredi, de 9h à 18h.
                </p>
                <div className="space-y-2 text-white/90">
                  <p>Email: support@savyn.com</p>
                  <p>Téléphone: +33 1 23 45 67 89</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
