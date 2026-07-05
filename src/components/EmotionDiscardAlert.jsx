import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

export default function EmotionDiscardAlert({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  confirmLabel = 'Continuar sin guardar',
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="emotion-discard-alert">
        <AlertDialogHeader>
          <AlertDialogTitle>Emoción sin reflexión</AlertDialogTitle>
          <AlertDialogDescription>
            Para registrar correctamente tu emoción, añade una reflexión que permita identificar qué la provocó.
            Si continúas o sales ahora, la emoción no se guardará. ¿Seguro que quieres continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Seguir escribiendo</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
