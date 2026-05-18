import SpecialistProfileClient from '@/components/specialist/SpecialistProfileClient';

interface SpecialistPageProps {
  params: {
    lang: 'ru' | 'ua' | 'de';
    id: string;
  };
}

export default function SpecialistPage({ params }: SpecialistPageProps) {
  return <SpecialistProfileClient lang={params.lang} id={params.id} />;
}
