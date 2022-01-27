export class Todo {
  constructor(
    public task: string,
    public priority: string,
    public dueDate: Date,
    public taskId: string,
    public completed?: boolean,
    public showCardButtons?: boolean
  ){}
}
