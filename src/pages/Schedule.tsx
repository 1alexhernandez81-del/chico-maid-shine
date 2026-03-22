import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle, Loader2, Home, Sparkles, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

const phoneRegex = /^[\d\s\-\(\)\+]{7,20}$/;

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email (e.g. jane@example.com)").max(255),
  phone: z.string().trim().min(1, "Phone number is required").max(20).regex(phoneRegex, "Please enter a valid phone number (e.g. (530) 555-0123)"),
  street: z.string().trim().min(1, "Street address is required").max(200),
  city: z.string().trim().min(1, "City is required").max(100),
  zip: z.string().trim().min(5, "Please enter a valid zip code (e.g. 95928)").max(10).regex(/^\d{5}(-\d{4})?$/, "Please enter a valid zip code (e.g. 95928)"),
  estimateDate: z.date({ required_error: "Please select a date for the in-home estimate" }),
  estimateTime: z.string({ required_error: "Please select a preferred time" }).min(1, "Please select a preferred time"),
  serviceType: z.enum(["residential", "commercial", "construction", "one-time", "other"], {
    required_error: "Please select a service type",
  }),
  otherService: z.string().trim().max(200).optional(),
  sqft: z.string().trim().max(10).optional(),
  bedrooms: z.string({ required_error: "Please select bedrooms" }).min(1, "Please select bedrooms"),
  bathrooms: z.string({ required_error: "Please select bathrooms" }).min(1, "Please select bathrooms"),
  frequency: z.enum(["one-time", "weekly", "bi-weekly", "every-3-weeks", "monthly"], {
    required_error: "Please select a cleaning frequency",
  }),
  preferredDate: z.date({ required_error: "Please select a preferred date" }),
  preferredTime: z.string({ required_error: "Please select a preferred time" }).min(1, "Please select a preferred time"),
  notes: z.string().trim().max(1000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const Schedule = () => {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedEstimateTimes, setBookedEstimateTimes] = useState<string[]>([]);
  const { t } = useLanguage();
  const { toast } = useToast();

  const fetchBookedTimes = useCallback(async (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const formattedDate = format(date, "PPP");
    // Try both date formats since admin may store as yyyy-MM-dd or PPP
    const { data: times1 } = await supabase.rpc("get_booked_estimate_times", { _date: dateStr });
    const { data: times2 } = await supabase.rpc("get_booked_estimate_times", { _date: formattedDate });
    const allTimes = [...(times1 || []), ...(times2 || [])];
    setBookedEstimateTimes([...new Set(allTimes)]);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", email: "", phone: "", street: "", city: "Chico", zip: "",
      sqft: "", notes: "", otherService: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          ...data,
          estimateDate: format(data.estimateDate, "PPP"),
          estimateTime: data.estimateTime,
          preferredDate: format(data.preferredDate, "PPP"),
        },
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error("Submit error:", err);
      toast({
        title: "Error",
        description: "Could not send your request. Please call us at (530) 966-0752.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="text-center max-w-md">
            <CheckCircle className="w-16 h-16 text-accent mx-auto mb-4" />
            <h2 className="font-display text-4xl text-foreground mb-3">{t("schedule.thanks")}</h2>
            <p className="font-body font-light text-muted-foreground mb-6">
              {t("schedule.thanks.msg")}
            </p>
            <button
              onClick={() => { setSubmitted(false); form.reset(); }}
              className="border-2 border-accent bg-accent text-accent-foreground px-6 py-3 text-xs uppercase tracking-[0.15em] font-body hover:bg-accent/90 transition-colors"
            >
              {t("schedule.another")}
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-6 md:px-12 max-w-2xl">
          <div className="mb-14">
            <h1 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.95] text-accent mb-4">
              {t("schedule.title")}
            </h1>
            <p className="font-body font-light text-muted-foreground text-lg mb-8">
              {t("schedule.subtitle")}
            </p>

            {/* How It Works */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-display text-lg text-foreground mb-4">{t("schedule.howitworks")}</h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0">
                {[
                  { step: "1", label: t("schedule.step1.label"), desc: t("schedule.step1.desc") },
                  { step: "2", label: t("schedule.step2.label"), desc: t("schedule.step2.desc") },
                  { step: "3", label: t("schedule.step3.label"), desc: t("schedule.step3.desc") },
                  { step: "4", label: t("schedule.step4.label"), desc: t("schedule.step4.desc") },
                ].map((item, i) => (
                  <div key={item.step} className="flex items-center gap-3 sm:flex-1">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
                        <span className="text-xs font-semibold text-accent">{item.step}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-body text-sm font-medium text-foreground leading-tight">{item.label}</p>
                        <p className="font-body text-[11px] text-muted-foreground leading-tight">{item.desc}</p>
                      </div>
                    </div>
                    {i < 3 && (
                      <span className="hidden sm:block text-muted-foreground/40 text-lg mx-1">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              {/* Contact Info */}
              <fieldset className="space-y-4">
                <legend className="font-body text-xs uppercase tracking-[0.2em] text-accent font-medium border-b border-accent/30 pb-2 mb-4 w-full">{t("schedule.contact")}</legend>
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel className="font-body font-normal text-sm">{t("schedule.name")}</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel className="font-body font-normal text-sm">{t("schedule.email")}</FormLabel><FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel className="font-body font-normal text-sm">{t("schedule.phone")}</FormLabel><FormControl><Input type="tel" placeholder="(530) 555-0123" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </fieldset>

              {/* Address */}
              <fieldset className="space-y-4">
                <legend className="font-body text-xs uppercase tracking-[0.2em] text-accent font-medium border-b border-accent/30 pb-2 mb-4 w-full">{t("schedule.address")}</legend>
                <FormField control={form.control} name="street" render={({ field }) => (
                  <FormItem><FormLabel className="font-body font-normal text-sm">{t("schedule.street")}</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem><FormLabel className="font-body font-normal text-sm">{t("schedule.city")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="zip" render={({ field }) => (
                    <FormItem><FormLabel className="font-body font-normal text-sm">{t("schedule.zip")}</FormLabel><FormControl><Input placeholder="95928" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </fieldset>

              {/* In-Home Estimate */}
              <fieldset className="space-y-4">
                <legend className="font-body text-xs uppercase tracking-[0.2em] text-accent font-medium border-b border-accent/30 pb-2 mb-4 w-full flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  {t("schedule.estimate")}
                </legend>
                <div className="p-5 rounded-xl border-2 border-blue-500/30 bg-blue-500/5">
                  <p className="font-body text-sm text-muted-foreground mb-3">
                    {t("schedule.estimate.desc")}
                  </p>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="font-body text-xs font-medium text-blue-300">
                      {t("schedule.estimate.callout")}
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="estimateDate" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="font-body font-normal text-sm">{t("schedule.estimate.date")}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("pl-3 text-left font-body font-light", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>{t("schedule.pickdate")}</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                if (date) {
                                  fetchBookedTimes(date);
                                  form.setValue("estimateTime", "");
                                }
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="estimateTime" render={({ field }) => {
                      const allSlots = [
                        { value: "09:30", label: "9:30 AM", recommended: true },
                        { value: "10:00", label: "10:00 AM", recommended: true },
                        { value: "10:30", label: "10:30 AM", recommended: true },
                        { value: "11:00", label: "11:00 AM", recommended: true },
                        { value: "11:30", label: "11:30 AM" },
                        { value: "12:00", label: "12:00 PM" },
                        { value: "12:30", label: "12:30 PM" },
                        { value: "13:00", label: "1:00 PM" },
                        { value: "13:30", label: "1:30 PM" },
                        { value: "14:00", label: "2:00 PM" },
                        { value: "14:30", label: "2:30 PM" },
                        { value: "15:00", label: "3:00 PM" },
                        { value: "15:30", label: "3:30 PM" },
                        { value: "16:00", label: "4:00 PM" },
                        { value: "16:30", label: "4:30 PM" },
                        { value: "17:00", label: "5:00 PM" },
                      ];
                      return (
                        <FormItem>
                          <FormLabel className="font-body font-normal text-sm">{t("schedule.estimate.time")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder={t("schedule.selecttime")} /></SelectTrigger></FormControl>
                            <SelectContent>
                              {allSlots.map((slot) => {
                                const isBooked = bookedEstimateTimes.includes(slot.value);
                                return (
                                  <SelectItem key={slot.value} value={slot.value} disabled={isBooked}>
                                    {slot.label}{slot.recommended ? " ⭐ Recommended" : ""}{isBooked ? " — Booked" : ""}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }} />
                  </div>
                </div>
              </fieldset>

              {/* Service Details */}
              <fieldset className="space-y-4">
                <legend className="font-body text-xs uppercase tracking-[0.2em] text-accent font-medium border-b border-accent/30 pb-2 mb-4 w-full">{t("schedule.details")}</legend>
                <FormField control={form.control} name="serviceType" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-body font-normal text-sm">{t("schedule.type")}</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 gap-3">
                        {[
                          { value: "residential", label: t("schedule.residential") },
                          { value: "commercial", label: t("schedule.commercial") },
                          { value: "construction", label: t("schedule.construction") },
                          { value: "one-time", label: t("schedule.onetime") },
                          { value: "other", label: t("schedule.other") },
                        ].map((option) => (
                          <label
                            key={option.value}
                            htmlFor={`service-${option.value}`}
                            className={cn(
                              "flex items-center space-x-2 cursor-pointer border rounded-md px-4 py-3 transition-all duration-200",
                              field.value === option.value
                                ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                                : "border-border hover:border-accent/50"
                            )}
                          >
                            <RadioGroupItem value={option.value} id={`service-${option.value}`} className="border-accent text-accent" />
                            <span className={cn(
                              "font-body text-sm transition-colors",
                              field.value === option.value ? "text-accent font-medium" : "font-light"
                            )}>{option.label}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {form.watch("serviceType") === "other" && (
                  <FormField control={form.control} name="otherService" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body font-normal text-sm">{t("schedule.otherDesc")}</FormLabel>
                      <FormControl>
                        <Input placeholder="Describe the service you're looking for..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <div className="grid sm:grid-cols-3 gap-4">
                  <FormField control={form.control} name="sqft" render={({ field }) => (
                    <FormItem><FormLabel className="font-body font-normal text-sm">{t("schedule.sqft")}</FormLabel><FormControl><Input placeholder="1,200" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="bedrooms" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body font-normal text-sm">{t("schedule.bedrooms")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("schedule.select")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {["0", "1", "2", "3", "4", "5+"].map((n) => (
                            <SelectItem key={n} value={n}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="bathrooms" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body font-normal text-sm">{t("schedule.bathrooms")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("schedule.select")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {["0", "1", "2", "3", "4", "5+"].map((n) => (
                            <SelectItem key={n} value={n}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="frequency" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-body font-normal text-sm">{t("schedule.frequency")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("schedule.selectfreq")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="one-time">{t("schedule.freq.onetime")}</SelectItem>
                        <SelectItem value="weekly">{t("schedule.freq.weekly")}</SelectItem>
                        <SelectItem value="bi-weekly">{t("schedule.freq.biweekly")}</SelectItem>
                        <SelectItem value="every-3-weeks">{t("schedule.freq.3weeks")}</SelectItem>
                        <SelectItem value="monthly">{t("schedule.freq.monthly")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </fieldset>

              {/* Desired Cleaning Date */}
              <fieldset className="space-y-4">
                <legend className="font-body text-xs uppercase tracking-[0.2em] text-accent font-medium border-b border-accent/30 pb-2 mb-4 w-full flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t("schedule.cleaning")}
                </legend>
                <div className="p-5 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5">
                  <p className="font-body text-sm text-muted-foreground mb-3">
                    {t("schedule.cleaning.desc")}
                  </p>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
                    <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="font-body text-xs font-medium text-emerald-300">
                      {t("schedule.cleaning.callout")}
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="preferredDate" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="font-body font-normal text-sm">{t("schedule.cleaning.date")}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("pl-3 text-left font-body font-light", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>{t("schedule.pickdate")}</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="preferredTime" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-body font-normal text-sm">{t("schedule.time")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder={t("schedule.selecttime")} /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="morning">{t("schedule.morning")}</SelectItem>
                            <SelectItem value="afternoon">{t("schedule.afternoon")}</SelectItem>
                            <SelectItem value="evening">{t("schedule.evening")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              </fieldset>

              {/* Notes */}
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-body font-normal text-sm">{t("schedule.notes")}</FormLabel>
                  <FormControl><Textarea placeholder={t("schedule.notes.placeholder")} rows={4} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full border-2 border-accent bg-accent text-accent-foreground px-8 py-4 text-sm uppercase tracking-[0.15em] font-body hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? "Sending..." : t("schedule.submit")}
              </button>
            </form>
          </Form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Schedule;
