export type Person = { id: string; name: string | null; email: string };

function initialsFor(person: Person) {
  const name = person.name?.trim();
  if (name) {
    const words = name.split(/\s+/).filter(Boolean);
    const initials = words.length >= 2 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2);
    return initials.toUpperCase();
  }
  return person.email.slice(0, 2).toUpperCase();
}

export function CollaboratorAvatars({ people }: { people: Person[] }) {
  if (people.length === 0) return null;

  return (
    <div className="flex -space-x-2">
      {people.map((person) => (
        <div
          key={person.id}
          title={person.name ?? person.email}
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-200 text-[10px] font-medium text-neutral-700 dark:border-neutral-950 dark:bg-neutral-700 dark:text-neutral-200"
        >
          {initialsFor(person)}
        </div>
      ))}
    </div>
  );
}
