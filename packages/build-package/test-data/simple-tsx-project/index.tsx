export interface GreetingProps {
    message: string;
}

export function Greeting({ message }: GreetingProps) {
    return <div>{message}</div>;
}
