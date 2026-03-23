import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Send, MessageSquare, Loader2, FileText, ChevronDown, ChevronRight, Plus, Languages, Mail, StickyNote } from "lucide-react";

const QUOTE_CTA_TEMPLATE_IDS = new Set(["send-quote", "general-followup"]);
const APPROVE_QUOTE_CTA_LABEL = "✅ Approve Quote & Book Cleaning";

export type Communication = {
  id: string;
  booking_id: string | null;
  customer_id: string | null;
  type: string;
  subject: string | null;
  body: string | null;
  created_at: string;
  thread_id?: string | null;
  email_message_id?: string | null;
  in_reply_to?: string | null;
  direction?: string;
};

type EmailTemplate = {
  id: string;
  name: string;
  icon?: React.ReactNode;
  color?: string;
  subject: string;
  body: string;
};

type Thread = {
  threadId: string;
  subject: string;
  messages: Communication[];
  firstDate: string;
  lastDate: string;
};

interface ThreadedChatProps {
  bookingId?: string;
  bookingIds?: string[];
  customerId?: string;
  customerName: string;
  customerEmail: string;
  templates: EmailTemplate[];
  initialSubject?: string;
  initialBody?: string;
  onEmailSent?: () => void;
  onInitialConsumed?: () => void;
}

const ThreadedChat = ({ bookingId, bookingIds, customerId, customerName, customerEmail, templates, initialSubject, initialBody, onEmailSent, onInitialConsumed }: ThreadedChatProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();

  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  // Compose state
  const [replyThreadId, setReplyThreadId] = useState<string | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  // New thread compose
  const [showNewThread, setShowNewThread] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [approveQuoteUrl, setApproveQuoteUrl] = useState<string | null>(null);

  // Translation
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  const fetchCommunications = async () => {
    setLoading(true);
    let query = supabase
      .from("customer_communications")
      .select("*")
      .order("created_at", { ascending: true });

    // Build an OR filter that covers customer_id and all related booking IDs
    const allBookingIds = bookingIds?.length ? bookingIds : bookingId ? [bookingId] : [];
    const orParts: string[] = [];
    if (customerId) orParts.push(`customer_id.eq.${customerId}`);
    for (const bid of allBookingIds) {
      orParts.push(`booking_id.eq.${bid}`);
    }

    if (orParts.length > 0) {
      query = query.or(orParts.join(","));
    } else {
      // No filters — return empty
      setCommunications([]);
      setLoading(false);
      return;
    }

    const { data, error } = await query;
    if (!error) setCommunications((data as Communication[]) || []);
    setLoading(false);
  };

  const normalizeSubject = (value: string) => value.replace(/^re:\s*/i, "").trim().toLowerCase();

  const getTemplateIdBySubject = (subject: string) => {
    const normalized = normalizeSubject(subject);
    return templates.find((tmpl) => normalizeSubject(tmpl.subject) === normalized)?.id ?? null;
  };

  const shouldAttachQuoteCta = (templateId: string | null, subject: string, body: string) => {
    if (templateId && QUOTE_CTA_TEMPLATE_IDS.has(templateId)) return true;

    const subjectLower = subject.toLowerCase();
    const bodyLower = body.toLowerCase();
    return (subjectLower.includes("estimate") || subjectLower.includes("quote")) && bodyLower.includes("estimated quote");
  };

  const attachQuoteCta = (
    emailPayload: Record<string, string>,
    subject: string,
    body: string,
    templateId: string | null,
  ) => {
    const approveUrlMatch = body.match(/(https:\/\/[^\s]*\/approve-quote\?token=[^\s]+)/);
    if (approveUrlMatch) {
      emailPayload.ctaUrl = approveUrlMatch[1];
      emailPayload.ctaLabel = APPROVE_QUOTE_CTA_LABEL;
      return;
    }

    if (approveQuoteUrl && shouldAttachQuoteCta(templateId, subject, body)) {
      emailPayload.ctaUrl = approveQuoteUrl;
      emailPayload.ctaLabel = APPROVE_QUOTE_CTA_LABEL;
    }
  };

  useEffect(() => {
    fetchCommunications();
  }, [bookingId, bookingIds?.join(","), customerId]);

  useEffect(() => {
    let isMounted = true;

    const fetchApproveQuoteUrl = async () => {
      if (!bookingId) {
        if (isMounted) setApproveQuoteUrl(null);
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("confirmation_token")
        .eq("id", bookingId)
        .single();

      if (!isMounted) return;
      if (error) {
        setApproveQuoteUrl(null);
        return;
      }

      let token = data?.confirmation_token ?? null;

      if (!token) {
        token = crypto.randomUUID();
        const { error: tokenError } = await supabase
          .from("bookings")
          .update({ confirmation_token: token })
          .eq("id", bookingId);

        if (tokenError) {
          setApproveQuoteUrl(null);
          return;
        }
      }

      setApproveQuoteUrl(`https://maidforchico.com/approve-quote?token=${token}`);
    };

    fetchApproveQuoteUrl();

    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  // Handle initial subject/body from quick-email buttons
  useEffect(() => {
    if (initialSubject && initialBody) {
      setShowNewThread(true);
      setNewSubject(initialSubject);
      setNewBody(initialBody);
      const matchedTemplateId = templates.find((tmpl) => tmpl.subject === initialSubject && tmpl.body === initialBody)?.id ?? null;
      setActiveTemplateId(matchedTemplateId);
      onInitialConsumed?.();
    }
  }, [initialSubject, initialBody, templates, onInitialConsumed]);

  // Group into threads
  const threads: Thread[] = useMemo(() => {
    const threadMap = new Map<string, Communication[]>();
    
    for (const c of communications) {
      const tid = c.thread_id || c.id; // fallback: each message is its own thread
      if (!threadMap.has(tid)) threadMap.set(tid, []);
      threadMap.get(tid)!.push(c);
    }

    const result: Thread[] = [];
    for (const [threadId, messages] of threadMap) {
      const subject = messages[0].subject || "No Subject";
      result.push({
        threadId,
        subject,
        messages,
        firstDate: messages[0].created_at,
        lastDate: messages[messages.length - 1].created_at,
      });
    }

    // Sort threads by latest message descending
    result.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());

    // Auto-expand the most recent thread
    if (result.length > 0 && expandedThreads.size === 0) {
      setExpandedThreads(new Set([result[0].threadId]));
    }

    return result;
  }, [communications]);

  const toggleThread = (threadId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  };

  const translateText = async (key: string, text: string) => {
    if (translations[key]) {
      setTranslations((prev) => { const n = { ...prev }; delete n[key]; return n; });
      return;
    }
    setTranslating((prev) => ({ ...prev, [key]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("translate-text", {
        body: { text, targetLang: "es" },
      });
      if (error) throw error;
      setTranslations((prev) => ({ ...prev, [key]: data.translated }));
    } catch {
      toast({ title: t("admin.error"), description: t("admin.thread.translate.fail"), variant: "destructive" });
    }
    setTranslating((prev) => ({ ...prev, [key]: false }));
  };

  const sendReply = async (threadId: string, subject: string, body: string) => {
    if (!body.trim() || !subject.trim()) return;
    setSending(true);
    try {
      // Find the last message in this thread to get threading info
      const thread = threads.find((t) => t.threadId === threadId);
      const lastMsg = thread?.messages[thread.messages.length - 1];
      const inReplyTo = lastMsg?.email_message_id || null;
      const templateId = getTemplateIdBySubject(subject);

      // Build references chain
      const refs = thread?.messages
        .map((m) => m.email_message_id)
        .filter(Boolean)
        .join(" ") || null;

      const emailPayload: Record<string, string> = {
        customerEmail,
        customerName,
        subject: `Re: ${subject}`,
        body,
      };

      attachQuoteCta(emailPayload, subject, body, templateId);

      if (inReplyTo) emailPayload.inReplyTo = inReplyTo;
      if (refs) emailPayload.references = refs;

      const { data, error } = await supabase.functions.invoke("send-customer-email", {
        body: emailPayload,
      });
      if (error) throw error;

      // Log communication with thread_id
      await supabase.from("customer_communications").insert({
        booking_id: bookingId || null,
        customer_id: customerId || null,
        type: "email",
        subject: `Re: ${subject}`,
        body,
        thread_id: threadId,
        email_message_id: data?.messageId || null,
        in_reply_to: inReplyTo,
        direction: "outbound",
      });

      toast({ title: t("admin.thread.reply.sent"), description: `${t("admin.thread.reply.sent.desc")} ${customerEmail}` });
      setReplyThreadId(null);
      setReplySubject("");
      setReplyBody("");
      fetchCommunications();
      onEmailSent?.();
    } catch (err) {
      console.error("Send reply error:", err);
      toast({ title: t("admin.error"), description: t("admin.thread.reply.fail"), variant: "destructive" });
    }
    setSending(false);
  };

  const sendNewThread = async () => {
    if (!newBody.trim() || !newSubject.trim()) return;
    setSending(true);
    try {
      const emailPayload: Record<string, string> = {
        customerEmail,
        customerName,
        subject: newSubject,
        body: newBody,
      };

      attachQuoteCta(emailPayload, newSubject, newBody, activeTemplateId);

      const { data, error } = await supabase.functions.invoke("send-customer-email", {
        body: emailPayload,
      });
      if (error) throw error;

      // Generate a new thread_id for this thread
      const newThreadId = crypto.randomUUID();

      await supabase.from("customer_communications").insert({
        booking_id: bookingId || null,
        customer_id: customerId || null,
        type: "email",
        subject: newSubject,
        body: newBody,
        thread_id: newThreadId,
        email_message_id: data?.messageId || null,
        direction: "outbound",
      });

      toast({ title: t("admin.thread.email.sent"), description: `${t("admin.thread.email.sent.desc")} ${customerEmail}` });
      setNewSubject("");
      setNewBody("");
      setActiveTemplateId(null);
      setShowNewThread(false);
      fetchCommunications();
      onEmailSent?.();
    } catch (err) {
      console.error("Send email error:", err);
      toast({ title: t("admin.error"), description: t("admin.thread.email.fail"), variant: "destructive" });
    }
    setSending(false);
  };

  const applyTemplate = (tmpl: EmailTemplate) => {
    setNewSubject(tmpl.subject);
    setNewBody(tmpl.body);
    setActiveTemplateId(tmpl.id);
    setTemplatePickerOpen(false);
    setShowNewThread(true);
  };

  const firstName = customerName.trim().split(/\s+/)[0] || "there";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5" /> {t("admin.thread.messageswith")} {firstName}
        </h4>
        <div className="flex gap-2">
          <Popover open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5" /> {t("admin.thread.template")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="end">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1.5 uppercase tracking-wider">{t("admin.thread.quicktemplates")}</p>
              <div className="space-y-1">
                {templates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => applyTemplate(tmpl)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-xs text-left hover:bg-secondary transition-colors ${tmpl.color || ''}`}
                  >
                    {tmpl.icon}
                    <span className="font-medium">{tmpl.name}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {
              setShowNewThread(true);
              setNewSubject("");
              setNewBody("");
              setActiveTemplateId(null);
            }}
          >
            <Plus className="w-3.5 h-3.5" /> {t("admin.thread.newthread")}
          </Button>
        </div>
      </div>

      {/* New thread compose */}
      {showNewThread && (
        <div className="border border-accent/30 rounded-lg p-3 space-y-2 bg-accent/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-accent">✉️ {t("admin.thread.newemailthread")}</p>
            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs" onClick={() => setShowNewThread(false)}>
              ✕
            </Button>
          </div>
          <Input
            placeholder={t("admin.thread.subject")}
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            className="text-sm"
          />
          <Textarea
            placeholder={t("admin.thread.typemsg")}
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <Button
            onClick={sendNewThread}
            disabled={sending || !newSubject.trim() || !newBody.trim()}
            className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            size="sm"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? t("admin.thread.sending") : t("admin.thread.sendstart")}
          </Button>
        </div>
      )}

      {/* Threads */}
      <ScrollArea className="h-[320px] rounded-lg border border-border">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-6">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> {t("admin.thread.loading")}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-6 gap-2">
            <MessageSquare className="w-8 h-8 opacity-30" />
            <p>{t("admin.thread.nomessages")}</p>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs mt-1" onClick={() => setShowNewThread(true)}>
              <Plus className="w-3 h-3" /> {t("admin.thread.start")}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {threads.map((thread) => {
              const isExpanded = expandedThreads.has(thread.threadId);
              return (
                <Collapsible key={thread.threadId} open={isExpanded} onOpenChange={() => toggleThread(thread.threadId)}>
                  {/* Thread header */}
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-secondary/50 transition-colors text-left">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                      <Mail className="w-3.5 h-3.5 text-accent shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{thread.subject}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(thread.firstDate).toLocaleDateString()} · {thread.messages.length} {thread.messages.length !== 1 ? t("admin.thread.messages") : t("admin.thread.message")}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        {thread.messages[thread.messages.length - 1].direction === "inbound" ? "📥" : "📧"} {new Date(thread.lastDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Badge>
                    </button>
                  </CollapsibleTrigger>

                  {/* Thread messages */}
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-2">
                      {thread.messages.map((msg) => {
                        const isOutbound = msg.direction !== "inbound";
                        const isNote = msg.type === "note";
                        return (
                          <div
                            key={msg.id}
                            className={`max-w-[85%] p-2.5 rounded-lg text-xs ${
                              isNote
                                ? "bg-muted/50 border border-dashed border-border mx-auto max-w-full"
                                : isOutbound
                                  ? "bg-accent/10 border border-accent/20 ml-0 mr-auto"
                                  : "bg-secondary border border-border ml-auto mr-0"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              {isNote ? (
                                <StickyNote className="w-2.5 h-2.5 text-muted-foreground" />
                              ) : isOutbound ? (
                                <Send className="w-2.5 h-2.5 text-accent" />
                              ) : (
                                <Mail className="w-2.5 h-2.5 text-muted-foreground" />
                              )}
                              <span className="text-[10px] font-medium">
                                {isNote ? t("admin.thread.note") : isOutbound ? t("admin.thread.you") : firstName}
                              </span>
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {new Date(msg.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                              {translations[`msg-${msg.id}`] || msg.body}
                            </p>
                            {translations[`msg-${msg.id}`] && (
                              <p className="text-[9px] text-muted-foreground italic mt-1">{t("admin.translate.auto")}</p>
                            )}
                            {msg.body && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground mt-1"
                                onClick={() => translateText(`msg-${msg.id}`, msg.body!)}
                                disabled={translating[`msg-${msg.id}`]}
                              >
                                {translating[`msg-${msg.id}`] ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Languages className="w-2.5 h-2.5" />
                                )}
                                {translations[`msg-${msg.id}`] ? t("admin.translate.original") : t("admin.translate.btn")}
                              </Button>
                            )}
                          </div>
                        );
                      })}

                      {/* Inline reply */}
                      {replyThreadId === thread.threadId ? (
                        <div className="mt-2 space-y-2 border-t border-border pt-2">
                          <Textarea
                            placeholder={`Reply to "${thread.subject}"...`}
                            value={replyBody}
                            onChange={(e) => setReplyBody(e.target.value)}
                            rows={2}
                            className="text-xs"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => sendReply(thread.threadId, thread.subject, replyBody)}
                              disabled={sending || !replyBody.trim()}
                              size="sm"
                              className="gap-1.5 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                            >
                              {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                              Reply
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => { setReplyThreadId(null); setReplyBody(""); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setReplyThreadId(thread.threadId); setReplySubject(thread.subject); setReplyBody(""); }}
                          className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-md border border-dashed border-border hover:border-accent/30 transition-colors mt-1"
                        >
                          Reply in this thread...
                        </button>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ThreadedChat;
