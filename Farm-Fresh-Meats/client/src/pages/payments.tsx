import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPayments, fetchPaymentExceptions, resolvePaymentException } from "@/lib/supabase-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  CreditCard,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Hash,
  CheckCheck,
} from "lucide-react";
import type { Payment, PaymentException } from "@shared/schema";

export default function Payments() {
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: fetchPayments,
  });

  const { data: exceptions = [], isLoading: exceptionsLoading } = useQuery<PaymentException[]>({
    queryKey: ["payment-exceptions"],
    queryFn: fetchPaymentExceptions,
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      return resolvePaymentException(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-exceptions"] });
    },
  });

  const totalReceived = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const successfulPayments = payments.filter((p) => p.resultCode === 0).length;
  const unresolvedExceptions = exceptions.filter((e) => !e.resolved).length;

  return (
    <div className="p-4 max-w-5xl mx-auto enkana-section-green min-h-full">
      <div className="mb-4">
        <h1 className="page-title" data-testid="text-page-title">Payments</h1>
        <p className="page-subtitle">M-Pesa payment records and exceptions</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Card className="enkana-card enkana-card-hover overflow-hidden border border-border shadow-sm ring-soft" data-testid="stat-total-received">
          <div className="flex items-center gap-3 p-3">
            <div className="enkana-icon-box grid h-11 w-11 shrink-0 place-items-center rounded-xl text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <div className="metric-label">Total Received</div>
              <div className="metric-value">KES {totalReceived.toLocaleString()}</div>
            </div>
          </div>
        </Card>
        <Card className="enkana-card enkana-card-hover overflow-hidden border border-border shadow-sm ring-soft" data-testid="stat-successful">
          <div className="flex items-center gap-3 p-3">
            <div className="enkana-icon-box grid h-11 w-11 shrink-0 place-items-center rounded-xl text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="metric-label">Successful</div>
              <div className="metric-value">{successfulPayments}</div>
            </div>
          </div>
        </Card>
        <Card className="enkana-card enkana-card-hover overflow-hidden border border-border shadow-sm ring-soft" data-testid="stat-total-payments">
          <div className="flex items-center gap-3 p-3">
            <div className="enkana-icon-box grid h-11 w-11 shrink-0 place-items-center rounded-xl text-accent">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="metric-label">Total Payments</div>
              <div className="metric-value">{payments.length}</div>
            </div>
          </div>
        </Card>
        <Card className="enkana-card enkana-card-hover overflow-hidden border border-border shadow-sm ring-soft" data-testid="stat-exceptions">
          <div className="flex items-center gap-3 p-3">
            <div className={`enkana-icon-box grid h-11 w-11 shrink-0 place-items-center rounded-xl ${unresolvedExceptions > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="metric-label">Unresolved</div>
              <div className="metric-value">{unresolvedExceptions}</div>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="mb-3">
          <TabsTrigger value="payments" data-testid="tab-payments">
            Payments ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="exceptions" data-testid="tab-exceptions">
            Exceptions ({exceptions.length})
            {unresolvedExceptions > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unresolvedExceptions}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          {paymentsLoading ? (
            <div className="py-20 text-center text-muted-foreground">Loading payments...</div>
          ) : payments.length === 0 ? (
            <Card className="enkana-card py-16 text-center border border-border shadow-sm ring-soft">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <div className="mt-4 text-lg font-semibold text-foreground">No payments yet</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Payments will appear here when customers complete M-Pesa payments.
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <Card key={payment.id} className="enkana-card border border-border p-3 shadow-sm ring-soft" data-testid={`payment-${payment.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="font-semibold text-foreground">
                          KES {(payment.amount || 0).toLocaleString()}
                        </span>
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          Successful
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {payment.mpesaTransactionId}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {payment.phoneNumber}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="exceptions">
          {exceptionsLoading ? (
            <div className="py-20 text-center text-muted-foreground">Loading exceptions...</div>
          ) : exceptions.length === 0 ? (
            <Card className="enkana-card py-16 text-center border border-border shadow-sm ring-soft">
              <CheckCheck className="mx-auto h-12 w-12 text-primary/40" />
              <div className="mt-4 text-lg font-semibold text-foreground">No exceptions</div>
              <div className="mt-1 text-sm text-muted-foreground">
                All payments have been matched to orders. No issues to review.
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {exceptions.map((exception) => (
                <Card
                  key={exception.id}
                  className={`enkana-card border border-border p-3 shadow-sm ring-soft ${exception.resolved ? "opacity-60" : ""}`}
                  data-testid={`exception-${exception.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {exception.resolved ? (
                          <CheckCircle2 className="h-4 w-4 text-gray-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-semibold text-foreground">
                          KES {(exception.amount || 0).toLocaleString()}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            exception.resolved
                              ? "bg-gray-50 text-gray-500 border-gray-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {exception.resolved ? "Resolved" : "Unresolved"}
                        </Badge>
                        {exception.resultCode !== null && exception.resultCode !== 0 && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                            Code: {exception.resultCode}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1.5 space-y-1">
                        {exception.reason && (
                          <div className="text-sm text-muted-foreground">{exception.reason}</div>
                        )}
                        {exception.resultDesc && (
                          <div className="text-xs text-muted-foreground">{exception.resultDesc}</div>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          {exception.phoneNumber && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {exception.phoneNumber}
                            </span>
                          )}
                          {exception.mpesaTransactionId && (
                            <span className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {exception.mpesaTransactionId}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(exception.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!exception.resolved && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" data-testid={`resolve-${exception.id}`}>
                            Resolve
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Mark as resolved?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will mark this payment exception as resolved. Make sure you've investigated and handled it appropriately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => resolveMutation.mutate(exception.id)}
                              data-testid={`confirm-resolve-${exception.id}`}
                            >
                              Mark Resolved
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
