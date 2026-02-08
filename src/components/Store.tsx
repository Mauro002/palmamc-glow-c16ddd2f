import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Star, Gem, Sparkles, ShoppingCart, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ranks = [
  {
    name: "VIP",
    price: 2.99,
    icon: Star,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    features: [
      "Kit VIP esclusivo",
      "Tag [VIP] in chat",
      "Accesso anticipato agli eventi",
      "2 home aggiuntive",
    ],
    popular: false,
  },
  {
    name: "OSCURO",
    price: 4.99,
    icon: Gem,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    features: [
      "Tutti i vantaggi VIP",
      "Kit OSCURO potenziato",
      "Tag [OSCURO] in chat",
      "5 home aggiuntive",
      "Fly nelle lobby",
    ],
    popular: true,
  },
  {
    name: "LAMINAX",
    price: 9.99,
    icon: Crown,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    features: [
      "Tutti i vantaggi OSCURO",
      "Kit LAMINAX leggendario",
      "Tag [LAMINAX] animato",
      "10 home aggiuntive",
      "Accesso beta nuove modalità",
      "Supporto prioritario",
    ],
    popular: false,
  },
  {
    name: "FURIAN",
    price: 14.99,
    icon: Sparkles,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    features: [
      "Tutti i vantaggi LAMINAX",
      "Kit FURIAN esclusivo",
      "Tag [FURIAN] personalizzabile",
      "Home illimitate",
      "Nickname colorato",
      "Accesso staff events",
      "Gadget esclusivi",
    ],
    popular: false,
  },
];

const Store = () => {
  const { user, session } = useAuth();
  const [selectedRank, setSelectedRank] = useState<typeof ranks[0] | null>(null);
  const [minecraftUsername, setMinecraftUsername] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  const handleBuyClick = (rank: typeof ranks[0]) => {
    if (!user) {
      toast.error("Devi accedere per acquistare un rank", {
        action: {
          label: "Accedi",
          onClick: () => window.location.href = "/auth",
        },
      });
      return;
    }
    setSelectedRank(rank);
    setShowPurchaseDialog(true);
  };

  const handlePurchase = async () => {
    if (!selectedRank || !minecraftUsername.trim()) {
      toast.error("Inserisci il tuo username Minecraft");
      return;
    }

    if (minecraftUsername.length < 3 || minecraftUsername.length > 16) {
      toast.error("Username Minecraft deve avere tra 3 e 16 caratteri");
      return;
    }

    setIsProcessing(true);

    try {
      // Create PayPal order
      const { data, error } = await supabase.functions.invoke("create-paypal-order", {
        body: {
          rankName: selectedRank.name,
          price: selectedRank.price,
          minecraftUsername: minecraftUsername.trim(),
        },
      });

      if (error) {
        throw error;
      }

      const orderId = data.orderId;

      // Redirect to PayPal
      window.open(
        `https://www.paypal.com/checkoutnow?token=${orderId}`,
        "_blank"
      );

      toast.info("Completa il pagamento su PayPal, poi torna qui", {
        duration: 10000,
      });

      // Poll for completion
      const checkPayment = async () => {
        const { data: captureData, error: captureError } = await supabase.functions.invoke(
          "capture-paypal-order",
          {
            body: { orderId },
          }
        );

        if (captureError) {
          console.error("Capture error:", captureError);
          return;
        }

        if (captureData.success) {
          toast.success(captureData.message);
          setShowPurchaseDialog(false);
          setMinecraftUsername("");
          setSelectedRank(null);
        }
      };

      // Check after 30 seconds
      setTimeout(checkPayment, 30000);

    } catch (error: any) {
      console.error("Purchase error:", error);
      toast.error("Errore durante l'acquisto. Riprova.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section id="store" className="py-20 scroll-mt-20">
      <div className="container mx-auto px-6">
        {/* Title */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-heading font-bold mb-4">
            <span className="text-gradient">Store</span> EldenMC
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Supporta il server e ottieni vantaggi esclusivi con i nostri rank premium
          </p>
          
          {!user && (
            <div className="mt-8 inline-flex items-center gap-2 bg-primary/20 border border-primary/40 rounded-full px-6 py-3">
              <User className="w-5 h-5 text-primary" />
              <span className="text-primary font-medium">
                <a href="/auth" className="hover:underline">Accedi</a> per acquistare un rank
              </span>
            </div>
          )}
        </div>

        {/* Ranks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {ranks.map((rank) => {
            const IconComponent = rank.icon;
            return (
              <Card 
                key={rank.name}
                className={`relative ${rank.bgColor} ${rank.borderColor} border-2 hover:scale-105 transition-all duration-300`}
              >
                {rank.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Più Popolare
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <div className={`mx-auto mb-4 p-4 rounded-full ${rank.bgColor}`}>
                    <IconComponent size={40} className={rank.color} />
                  </div>
                  <CardTitle className={`text-2xl font-heading ${rank.color}`}>
                    {rank.name}
                  </CardTitle>
                  <CardDescription className="text-3xl font-bold text-foreground">
                    {rank.price.toFixed(2)}€
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {rank.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star size={14} className={rank.color} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={rank.popular ? "hero" : "outline"}
                    onClick={() => handleBuyClick(rank)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Acquista Ora
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-20 text-center">
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 max-w-3xl mx-auto">
            <h3 className="text-2xl font-heading font-bold mb-4">Come funziona?</h3>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="text-primary font-bold text-lg mb-2">1. Registrati</div>
                <p className="text-muted-foreground text-sm">Crea un account con il tuo username Minecraft</p>
              </div>
              <div>
                <div className="text-primary font-bold text-lg mb-2">2. Paga con PayPal</div>
                <p className="text-muted-foreground text-sm">Procedi con il pagamento sicuro tramite PayPal</p>
              </div>
              <div>
                <div className="text-primary font-bold text-lg mb-2">3. Ricevi il rank</div>
                <p className="text-muted-foreground text-sm">Il rank verrà attivato automaticamente sul server</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Acquista {selectedRank?.name}
            </DialogTitle>
            <DialogDescription>
              Inserisci il tuo username Minecraft per procedere all'acquisto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="purchase-username">Username Minecraft</Label>
              <Input
                id="purchase-username"
                placeholder="Il tuo username sul server"
                value={minecraftUsername}
                onChange={(e) => setMinecraftUsername(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Assicurati che corrisponda esattamente al tuo username su EldenMC
              </p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Rank:</span>
                <span className="font-bold">{selectedRank?.name}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-muted-foreground">Prezzo:</span>
                <span className="font-bold text-primary">{selectedRank?.price.toFixed(2)}€</span>
              </div>
            </div>

            <Button 
              className="w-full" 
              variant="hero"
              onClick={handlePurchase}
              disabled={isProcessing || !minecraftUsername.trim()}
            >
              {isProcessing ? "Elaborazione..." : "Paga con PayPal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Store;
