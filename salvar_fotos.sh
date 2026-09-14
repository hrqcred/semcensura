#!/bin/bash
DEST="/Users/hrqcred/Desktop/projetos/stalkear namorado/img/reviews"
NAMES=("marcos" "giesel" "prozin" "camila" "thiago" "juliana" "rafael" "bea" "lucas" "amanda" "pedro" "fernanda")
LABELS=("Marcos (homem)" "Giesel (mulher, selfie rua)" "Prozin (homem, Nike verde)" "Camila (mulher, oculos sol)" "Thiago (homem, camisa branca taca)" "Juliana (mulher jovem, blusa branca)" "Rafael (homem, Mercedes)" "Bea (mulher, loira)" "Lucas (homem, oculos, camiseta preta)" "Amanda (mulher, cabelo cacheado)" "Pedro (homem, barba, jaqueta)" "Fernanda (mulher, no carro, brinco)")

echo ""
echo "=== SALVAR FOTOS DOS DEPOIMENTOS ==="
echo ""
echo "Selecione as 12 fotos NA ORDEM abaixo."
echo "Uma janela vai abrir pra cada foto."
echo ""

for i in "${!NAMES[@]}"; do
  echo "[$((i+1))/12] Selecione a foto de: ${LABELS[$i]}"
  FILE=$(osascript -e 'tell application "Finder" to activate' -e 'set f to POSIX path of (choose file with prompt "Selecione a foto de: '"${LABELS[$i]}"'" of type {"public.image"})' 2>/dev/null)
  if [ -z "$FILE" ]; then
    echo "  ⚠ Cancelado. Pulando..."
    continue
  fi
  EXT="${FILE##*.}"
  cp "$FILE" "$DEST/${NAMES[$i]}.jpg"
  echo "  ✅ Salvo como ${NAMES[$i]}.jpg"
done

echo ""
echo "=== PRONTO! Todas as fotos foram salvas. ==="
echo ""
ls -la "$DEST"
