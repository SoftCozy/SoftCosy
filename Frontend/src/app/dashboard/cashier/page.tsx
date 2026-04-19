'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Trash2, Plus, Minus, DollarSign, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

interface CartItem {
  cart_id: string       // ID unique pour le panier (produit_id + variante_id)
  product_id: number    // ID du produit parent
  variant_id: number    // ID de la variante spécifique
  name: string          // Nom complet (Super Produit + X-Large)
  category: string      // Nom de la catégorie
  price: number         // Prix de vente
  quantity: number      // Quantité ajoutée au panier
  image: string         // URL de l'image (locale ou distante)
  stock: number         // Limite de stock disponible
}

export default function CashierPage() {
  const [currentPage, setCurrentPage] = useState('cashier')
  const router = useRouter()
  const queryClient = useQueryClient()

  // État local du panier et du paiement
  const [cart, setCart] = useState<CartItem[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [amountPaid, setAmountPaid] = useState('')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [customerName, setCustomerName] = useState('')

  // Récupération des produits réels depuis le backend
  const { data: rawProducts, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products/')
      return res.data.results || res.data
    }
  })

  // Transformation des produits complexes en variantes simples vendables
  const availableProducts: CartItem[] = useMemo(() => {
    if (!rawProducts) return []
    const flatList: CartItem[] = []
    
    const productsArray = Array.isArray(rawProducts) ? rawProducts : (rawProducts.results || [])

    productsArray.forEach((p: any) => {
      const catName = p.category?.name || 'Non classé'
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v: any) => {
          if (v.is_active !== false) {
            flatList.push({
              cart_id: `p${p.id}-v${v.id}`,
              product_id: p.id,
              variant_id: v.id,
              name: `${p.name} ${v.size || ''} ${v.model || ''}`.trim(),
              category: catName,
              price: v.selling_price || 0,
              quantity: 0,
              // On privilégie l'image uploadée (image) sinon on prend le lien externe (image_url)
              image: p.image || p.image_url || '/placeholder.svg',
              stock: v.stock || 0
            })
          }
        })
      }
    })
    return flatList
  }, [rawProducts])

  // Extraction de la liste unique des catégories pour les filtres
  const categories = useMemo(() => {
    return ['all', ...new Set(availableProducts.map(p => p.category))]
  }, [availableProducts])

  // Filtrage des produits à afficher selon la catégorie sélectionnée
  const filteredProducts = selectedCategory === 'all' 
    ? availableProducts 
    : availableProducts.filter(p => p.category === selectedCategory)

  // Ajouter un produit au panier
  const addToCart = (product: CartItem) => {
    if (product.stock <= 0) return // Bloquer l'ajout si rupture de stock
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.cart_id === product.cart_id)
      if (existingItem) {
        if (existingItem.quantity >= product.stock) return prevCart // Empêcher de dépasser le stock max

        return prevCart.map(item =>
          item.cart_id === product.cart_id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prevCart, { ...product, quantity: 1 }]
    })
  }

  // Modifier la quantité d'un produit déjà au panier (+1 ou -1)
  const updateQuantity = (cart_id: string, delta: number, maxStock: number) => {
    setCart(prevCart =>
      prevCart
        .map(item => {
          if (item.cart_id === cart_id) {
            const newQ = Math.max(0, Math.min(maxStock, item.quantity + delta))
            return { ...item, quantity: newQ }
          }
          return item
        })
        .filter(item => item.quantity > 0) // Supprime l'objet si la quantité tombe à 0
    )
  }

  // Retirer un article spécifique du panier
  const removeFromCart = (cart_id: string) => {
    setCart(prevCart => prevCart.filter(item => item.cart_id !== cart_id))
  }

  // Calculs monétaires du panier (TVA supprimée)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal

  // Mutation React Query pour créer la vente côté serveur (backend Django)
  const makeSaleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/sales/', payload)
      return res.data
    },
    onSuccess: () => {
      // Rafraîchit les listes pour mettre à jour les jauges de stock immédiatement
      queryClient.invalidateQueries({ queryKey: ['products'] }) 
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      alert(`Vente enregistrée avec succès!`)
      setCart([]) // Vidage du panier
      setAmountPaid('')
      setDiscountAmount('0')
      setCustomerName('')
      setShowPaymentModal(false)
    },
    onError: (err: any) => {
      console.error(err)
      alert("Erreur lors de la vente. Vérifiez la console.")
    }
  })

  // Fonction finale pour valider le ticket et envoyer l'ordre au serveur
  const handlePayment = () => {
    const paid = parseFloat(amountPaid) || 0
    const discount = parseFloat(discountAmount) || 0
    const expected = total - discount

    if (paid === expected && cart.length > 0) {
      // Construction du payload pour l'API "create sale"
      const payload = {
        channel: 'store',
        status: 'PAYE',
        customer_name: customerName,
        discount_amount: discount,
        lines: cart.map(item => ({
          product: item.product_id,
          variant: item.variant_id,
          quantity: item.quantity,
          unit_price: item.price,
          line_discount: 0
        }))
      }
      makeSaleMutation.mutate(payload)
    } else if (paid !== expected) {
      alert(`Erreur : Le montant payé (${paid} FCFA) + remise (${discount} FCFA) doit être égal au total (${total} FCFA).`)
    }
  }

  return (
    <div className="flex flex-col h-full text-foreground">
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Section de gauche: Liste des produits */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Caisse</h1>
                <p className="text-muted-foreground mt-1">Effectuez une vente</p>
              </div>

              {/* Filtre de catégories */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {cat === 'all' ? 'Tous' : cat}
                  </button>
                ))}
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {isLoading ? (
                  <div className="col-span-full py-12 flex justify-center text-primary">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-muted-foreground">
                    Aucun produit disponible à la vente
                  </div>
                ) : (
                  filteredProducts.map(product => (
                    <Card
                      key={product.cart_id}
                      className={`overflow-hidden transition-all cursor-pointer ${
                        product.stock <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:shadow-lg'
                      }`}
                      onClick={() => addToCart(product)}
                    >
                      <div className="aspect-square bg-muted overflow-hidden relative">
                        <img
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                          className={`w-full h-full object-cover transition-transform ${product.stock > 0 ? 'hover:scale-110' : ''}`}
                        />
                        {product.stock <= 0 && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="bg-destructive text-white px-2 py-1 rounded text-xs font-bold">Rupture</span>
                          </div>
                        )}
                        {product.stock > 0 && product.stock <= 5 && (
                          <div className="absolute top-2 right-2 flex items-center justify-center">
                            <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                              {product.stock}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-2 relative">
                        <div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{product.category}</p>
                          <h3 className="font-semibold text-sm line-clamp-2 leading-tight h-10">{product.name}</h3>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-border/50">
                          <p className="text-lg font-bold text-primary">{product.price} FCFA</p>
                          <Button size="icon" variant="outline" className="w-8 h-8 shrink-0" disabled={product.stock <= 0}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Section de droite: Résumé du Panier */}
            <div className="space-y-4">
              <Card className="p-5 space-y-4 shadow-sm border border-border sticky top-0">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  Panier
                  {cart.length > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                      {cart.reduce((s, i) => s + i.quantity, 0)} items
                    </span>
                  )}
                </h2>

                {cart.length === 0 ? (
                  <div className="py-8 text-center bg-muted/30 rounded-lg border border-dashed border-border">
                    <p className="text-muted-foreground">Le panier est vide</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                      {cart.map(item => (
                        <div key={item.cart_id} className="space-y-2 pb-3 border-b border-border last:border-0 hover:bg-muted/30 p-2 -mx-2 rounded-lg transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 pr-2">
                              <p className="font-medium text-sm leading-tight">{item.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{item.price} FCFA</p>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.cart_id)}
                              className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 bg-muted/60 border border-border rounded-lg p-0.5">
                              <button
                                onClick={() => updateQuantity(item.cart_id, -1, item.stock)}
                                className="p-1 hover:bg-background rounded shadow-sm transition-colors text-muted-foreground"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.cart_id, 1, item.stock)}
                                disabled={item.quantity >= item.stock}
                                className="p-1 hover:bg-background rounded shadow-sm transition-colors disabled:opacity-30 disabled:hover:bg-transparent text-primary"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="font-bold">{(item.price * item.quantity).toFixed(2)} FCFA</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 py-4 border-t border-border">
                      <div className="flex justify-between text-xl font-bold pt-3 pb-1 border-t border-border mt-1">
                        <span>Total</span>
                        <span className="text-primary">{total.toLocaleString()} FCFA</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white h-12 rounded-lg font-bold text-lg shadow-md"
                    >
                      <DollarSign className="w-5 h-5 mr-2" />
                      Paiement
                    </Button>
                  </>
                )}
              </Card>
            </div>
          </div>
      </main>

      {/* Modal De Paiement */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md shadow-2xl border-0">
            <div className="p-6 space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-black text-foreground">Édition du Paiement</h3>
                <p className="text-muted-foreground mt-1">Terminer la transaction</p>
              </div>

              <div className="bg-primary/5 border border-primary/20 p-5 rounded-xl text-center">
                <p className="text-sm font-medium text-primary uppercase tracking-widest mb-1">Total Demandé</p>
                <p className="text-5xl font-black text-primary">{total.toFixed(2)} FCFA</p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Remise (FCFA)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      className="h-12 bg-muted/30 border-2 font-bold focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Net à Payer</label>
                    <div className="h-12 flex items-center justify-center bg-primary/10 rounded-md border-2 border-primary/20 text-primary font-black">
                      {(total - (parseFloat(discountAmount) || 0)).toLocaleString()} FCFA
                    </div>
                  </div>
                </div>

                <label className="text-sm font-semibold tracking-wide text-muted-foreground uppercase block pt-2">Montant reçu</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className={`text-2xl h-14 text-center font-bold bg-muted/50 border-2 focus-visible:ring-primary ${
                    amountPaid && parseFloat(amountPaid) === (total - (parseFloat(discountAmount) || 0)) 
                    ? 'border-emerald-500 bg-emerald-50/50' 
                    : amountPaid ? 'border-red-500' : ''
                  }`}
                  autoFocus
                />

                <label className="text-sm font-semibold tracking-wide text-muted-foreground uppercase pt-4 block">Nom du client (optionnel)</label>
                <Input
                  type="text"
                  placeholder="Ex: M. Jean"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-12 bg-muted/30 border-2 focus-visible:ring-primary"
                />
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2">
                <Button variant="outline" className="h-12 font-bold" onClick={() => setAmountPaid(total.toFixed(2))}>Exact</Button>
                <Button variant="outline" className="h-12 font-bold text-muted-foreground" onClick={() => setAmountPaid((total + 5000).toFixed(2))}>+5000 FCFA</Button>
                <Button variant="outline" className="h-12 font-bold text-muted-foreground" onClick={() => setAmountPaid((total + 10000).toFixed(2))}>+10000 FCFA</Button>
                <Button variant="outline" className="h-12 font-bold text-muted-foreground" onClick={() => setAmountPaid((total + 20000).toFixed(2))}>+20000 FCFA</Button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentModal(false)
                    setAmountPaid('')
                  }}
                  className="flex-1 h-12"
                  disabled={makeSaleMutation.isPending}
                >
                  Retour
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={!amountPaid || parseFloat(amountPaid) !== (total - (parseFloat(discountAmount) || 0)) || makeSaleMutation.isPending}
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {makeSaleMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Valider"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
