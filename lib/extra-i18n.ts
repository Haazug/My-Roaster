import type { Lang } from '@/lib/i18n'

export const CABIN: Record<Lang, { title: string; lines: string[] }> = {
  en: { title: 'Cabin announcement', lines: [
    'Ladies and gentlemen, we have reached our cruising altitude. You may now move around the cabin.',
    'The cabin crew will shortly begin the meal and beverage service.',
    'We are experiencing light turbulence. Please return to your seat and fasten your seat belt.',
    'Please remember to keep your seat belt fastened while seated.',
    'We will be arriving at our destination on time. Thank you for flying with us.',
  ] },
  pt: { title: 'Anúncio da cabine', lines: [
    'Senhoras e senhores, atingimos a altitude de cruzeiro. Já podem circular pela cabine.',
    'A tripulação vai iniciar em breve o serviço de refeições e bebidas.',
    'Estamos a atravessar uma ligeira turbulência. Regressem aos vossos lugares e apertem o cinto.',
    'Lembramos que devem manter o cinto de segurança apertado enquanto estiverem sentados.',
    'Prevemos chegar ao destino à hora prevista. Obrigado por voar connosco.',
  ] },
  it: { title: 'Annuncio di cabina', lines: [
    'Signore e signori, abbiamo raggiunto la quota di crociera. Potete muovervi liberamente in cabina.',
    "L'equipaggio inizierà a breve il servizio di pasti e bevande.",
    'Stiamo attraversando una leggera turbolenza. Tornate ai vostri posti e allacciate le cinture.',
    'Vi ricordiamo di tenere le cinture allacciate quando siete seduti.',
    'Arriveremo a destinazione in orario. Grazie per aver volato con noi.',
  ] },
  fr: { title: 'Annonce en cabine', lines: [
    'Mesdames et messieurs, nous avons atteint notre altitude de croisière. Vous pouvez circuler dans la cabine.',
    "L'équipage va bientôt commencer le service des repas et des boissons.",
    'Nous traversons de légères turbulences. Veuillez regagner votre siège et attacher votre ceinture.',
    'Nous vous rappelons de garder votre ceinture attachée lorsque vous êtes assis.',
    "Nous arriverons à destination à l'heure prévue. Merci d'avoir voyagé avec nous.",
  ] },
  es: { title: 'Anuncio de cabina', lines: [
    'Señoras y señores, hemos alcanzado la altitud de crucero. Pueden moverse por la cabina.',
    'La tripulación comenzará en breve el servicio de comidas y bebidas.',
    'Estamos atravesando una ligera turbulencia. Vuelvan a sus asientos y abrochen el cinturón.',
    'Les recordamos que mantengan el cinturón abrochado mientras estén sentados.',
    'Llegaremos a nuestro destino a la hora prevista. Gracias por volar con nosotros.',
  ] },
}

export const SUM: Record<Lang, Record<string, string>> = {
  en: { title: 'Flight summary', back: 'Back to logs', started: 'Started', takeoff: 'Takeoff', landing: 'Landing', finished: 'Finished', planned: 'Planned block time', airborne: 'Time airborne', total: 'Total time', distance: 'Distance', aircraft: 'Aircraft', level: 'Cruise level', rating: 'Your rating', checklist: 'Checklist', skipped: 'Skipped', free: 'Free flight', diff: 'vs plan', noDetails: 'No detailed times were saved for this older flight.', notFound: 'Flight not found.', loading: 'Loading…' },
  pt: { title: 'Resumo do voo', back: 'Voltar aos registos', started: 'Início', takeoff: 'Descolagem', landing: 'Aterragem', finished: 'Fim', planned: 'Tempo de bloco planeado', airborne: 'Tempo no ar', total: 'Tempo total', distance: 'Distância', aircraft: 'Aeronave', level: 'Nível de cruzeiro', rating: 'A tua avaliação', checklist: 'Checklist', skipped: 'Saltado', free: 'Voo livre', diff: 'face ao plano', noDetails: 'Este voo antigo não tem tempos detalhados.', notFound: 'Voo não encontrado.', loading: 'A carregar…' },
  it: { title: 'Riepilogo del volo', back: 'Torna ai registri', started: 'Inizio', takeoff: 'Decollo', landing: 'Atterraggio', finished: 'Fine', planned: 'Tempo di blocco previsto', airborne: 'Tempo in volo', total: 'Tempo totale', distance: 'Distanza', aircraft: 'Aeromobile', level: 'Livello di crociera', rating: 'La tua valutazione', checklist: 'Checklist', skipped: 'Saltato', free: 'Volo libero', diff: 'rispetto al piano', noDetails: 'Per questo volo meno recente non sono stati salvati i tempi dettagliati.', notFound: 'Volo non trovato.', loading: 'Caricamento…' },
  fr: { title: 'Résumé du vol', back: 'Retour aux journaux', started: 'Début', takeoff: 'Décollage', landing: 'Atterrissage', finished: 'Fin', planned: 'Temps bloc prévu', airborne: 'Temps en vol', total: 'Temps total', distance: 'Distance', aircraft: 'Appareil', level: 'Niveau de croisière', rating: 'Votre note', checklist: 'Checklist', skipped: 'Ignoré', free: 'Vol libre', diff: 'par rapport au plan', noDetails: "Aucun horaire détaillé n'a été enregistré pour ce vol plus ancien.", notFound: 'Vol introuvable.', loading: 'Chargement…' },
  es: { title: 'Resumen del vuelo', back: 'Volver a los registros', started: 'Inicio', takeoff: 'Despegue', landing: 'Aterrizaje', finished: 'Fin', planned: 'Tiempo de bloque previsto', airborne: 'Tiempo en vuelo', total: 'Tiempo total', distance: 'Distancia', aircraft: 'Aeronave', level: 'Nivel de crucero', rating: 'Tu valoración', checklist: 'Checklist', skipped: 'Omitido', free: 'Vuelo libre', diff: 'respecto al plan', noDetails: 'No se guardaron tiempos detallados de este vuelo anterior.', notFound: 'Vuelo no encontrado.', loading: 'Cargando…' },
}
