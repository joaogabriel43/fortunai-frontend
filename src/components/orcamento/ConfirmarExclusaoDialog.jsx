import React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Button
} from '@mui/material'

// `titulo`/`mensagem` são opcionais: os defaults preservam o texto original
// usado pela ListaTransacoes; o painel do cartão reaproveita o mesmo diálogo
// para excluir parcelamento e cartão com texto próprio.
const ConfirmarExclusaoDialog = ({
  open,
  onConfirm,
  onCancel,
  titulo = 'Confirmar exclusão',
  mensagem = 'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.',
}) => {
  return (
    <Dialog
      open={!!open}
      onClose={onCancel}
      data-testid="confirmar-exclusao-dialog"
    >
      <DialogTitle>{titulo}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {mensagem}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          Cancelar
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" autoFocus>
          Excluir
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmarExclusaoDialog
