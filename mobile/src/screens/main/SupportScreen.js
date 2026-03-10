import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { supportAPI } from '../../services/api';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config';

const FAQItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity style={styles.faqItem} onPress={() => setOpen(!open)} activeOpacity={0.7}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.gray[500]} />
      </View>
      {open && <Text style={styles.faqAnswer}>{answer}</Text>}
    </TouchableOpacity>
  );
};

const SupportScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const [tab, setTab] = useState('faq');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({ subject: '', message: '', category: 'general' });

  const fetchTickets = useCallback(async () => {
    try {
      const res = await supportAPI.getTickets();
      setTickets(res.data || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleSubmit = async () => {
    if (!form.subject || !form.message) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    try {
      await supportAPI.createTicket(form);
      Alert.alert('Succes', 'Votre ticket a ete envoye.');
      setForm({ subject: '', message: '', category: 'general' });
      fetchTickets();
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.detail || 'Erreur');
    } finally { setLoading(false); }
  };

  const faqs = [
    { q: 'Comment fonctionne une tontine ?', a: 'Une tontine est un groupe d\'epargne collective. Chaque membre verse un montant fixe chaque mois, et un membre recoit le pot total a tour de role.' },
    { q: 'Mes fonds sont-ils en securite ?', a: 'Oui, vos fonds sont detenus par Lemon Way, un prestataire de paiement agree. Savyn n\'a jamais acces direct a votre argent.' },
    { q: 'Comment est calcule le Trust Score ?', a: 'Le score est base sur le respect des paiements, l\'historique de participation, l\'anciennete et la verification KYC.' },
    { q: 'Que se passe-t-il en cas de defaut de paiement ?', a: 'Un fonds de garantie (3% de chaque contribution) couvre les defauts de paiement. Des procedures de recouvrement legales peuvent etre initiees.' },
    { q: 'Comment contacter le support ?', a: 'Vous pouvez creer un ticket ci-dessous ou envoyer un email a support@savyn.com.' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={COLORS.gray[700]} />
        </TouchableOpacity>
        <Text style={styles.title}>Support</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'faq' && styles.tabActive]} onPress={() => setTab('faq')}>
          <Text style={[styles.tabText, tab === 'faq' && styles.tabTextActive]}>FAQ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'ticket' && styles.tabActive]} onPress={() => setTab('ticket')}>
          <Text style={[styles.tabText, tab === 'ticket' && styles.tabTextActive]}>Nouveau ticket</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'history' && styles.tabActive]} onPress={() => setTab('history')}>
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>Mes tickets</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {tab === 'faq' && (
          <View>
            {faqs.map((faq, i) => <FAQItem key={i} question={faq.q} answer={faq.a} />)}
          </View>
        )}

        {tab === 'ticket' && (
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sujet</Text>
              <TextInput style={styles.input} placeholder="Sujet du ticket" value={form.subject} onChangeText={(t) => setForm({ ...form, subject: t })} placeholderTextColor={COLORS.gray[400]} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Categorie</Text>
              <View style={styles.categoryRow}>
                {['general', 'payment', 'technical', 'kyc'].map(cat => (
                  <TouchableOpacity key={cat} style={[styles.categoryBtn, form.category === cat && styles.categoryBtnActive]} onPress={() => setForm({ ...form, category: cat })}>
                    <Text style={[styles.categoryText, form.category === cat && styles.categoryTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Message</Text>
              <TextInput style={[styles.input, styles.textArea]} placeholder="Decrivez votre probleme..." value={form.message} onChangeText={(t) => setForm({ ...form, message: t })} multiline numberOfLines={5} placeholderTextColor={COLORS.gray[400]} />
            </View>
            <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Envoyer</Text>}
            </TouchableOpacity>
          </View>
        )}

        {tab === 'history' && (
          <View>
            {tickets.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="inbox" size={40} color={COLORS.gray[300]} />
                <Text style={styles.emptyText}>Aucun ticket</Text>
              </View>
            ) : (
              tickets.map((ticket, i) => (
                <View key={i} style={styles.ticketItem}>
                  <View style={styles.ticketHeader}>
                    <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                    <View style={[styles.ticketBadge, ticket.status === 'closed' && { backgroundColor: `${COLORS.success}15` }]}>
                      <Text style={[styles.ticketBadgeText, ticket.status === 'closed' && { color: COLORS.success }]}>{ticket.status === 'open' ? 'Ouvert' : 'Ferme'}</Text>
                    </View>
                  </View>
                  <Text style={styles.ticketMessage} numberOfLines={2}>{ticket.message}</Text>
                  <Text style={styles.ticketDate}>{ticket.created_at?.split('T')[0] || '-'}</Text>
                  {ticket.admin_response && (
                    <View style={styles.adminResponse}>
                      <Text style={styles.adminResponseLabel}>Reponse:</Text>
                      <Text style={styles.adminResponseText}>{ticket.admin_response}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: 12 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.black },
  tabs: { flexDirection: 'row', marginHorizontal: SPACING.md, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: 4, marginBottom: SPACING.md },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BORDER_RADIUS.md },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: COLORS.gray[600] },
  tabTextActive: { color: COLORS.white, fontWeight: '600' },
  scrollContent: { padding: SPACING.md, paddingTop: 0 },
  faqItem: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontSize: 15, fontWeight: '600', color: COLORS.black, flex: 1, marginRight: SPACING.sm },
  faqAnswer: { fontSize: 14, color: COLORS.gray[600], marginTop: SPACING.sm, lineHeight: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg },
  inputGroup: { marginBottom: SPACING.md },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.gray[700], marginBottom: SPACING.xs },
  input: { height: 48, backgroundColor: COLORS.gray[50], borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, fontSize: 16, color: COLORS.black },
  textArea: { height: 120, paddingTop: SPACING.sm, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  categoryBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BORDER_RADIUS.full, borderWidth: 1.5, borderColor: COLORS.gray[200] },
  categoryBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { fontSize: 13, color: COLORS.gray[600] },
  categoryTextActive: { color: COLORS.white },
  button: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.full, height: 52, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyText: { fontSize: 14, color: COLORS.gray[400], marginTop: SPACING.sm },
  ticketItem: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ticketSubject: { fontSize: 15, fontWeight: '600', color: COLORS.black, flex: 1 },
  ticketBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: BORDER_RADIUS.full, backgroundColor: `${COLORS.warning}15` },
  ticketBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.warning },
  ticketMessage: { fontSize: 13, color: COLORS.gray[600], marginBottom: 4 },
  ticketDate: { fontSize: 11, color: COLORS.gray[400] },
  adminResponse: { marginTop: SPACING.sm, padding: SPACING.sm, backgroundColor: COLORS.gray[50], borderRadius: BORDER_RADIUS.md },
  adminResponseLabel: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginBottom: 4 },
  adminResponseText: { fontSize: 13, color: COLORS.gray[700] },
});

export default SupportScreen;
