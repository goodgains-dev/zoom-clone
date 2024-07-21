'use client';

import React, { useEffect, useState } from 'react';
import {
  SignedIn,
  SignedOut,
  useUser,
  useOrganization,
  OrganizationSwitcher,
  UserButton,
} from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Head from 'next/head';
import { FiCircle, FiCheckCircle } from "react-icons/fi";
import { neon } from '@neondatabase/serverless';
import axios from 'axios';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';

const sql = neon("postgresql://Work_owner:2phUfPwWCM4b@ep-odd-leaf-a5fpwz5v.us-east-2.aws.neon.tech/Work?sslmode=require");

export type Task = {
  id: number;
  name: string;
  description: string;
  department: string;
  assignedTo: string;
  severity: number;
  is_done: boolean;
  owner_id: string;
  organization_id: string;
  created_on: Date;
  status: string;
};

async function getTasks(ownerId: string, organizationId: string): Promise<Task[]> {
  const res = await sql`
    SELECT * FROM tasks WHERE owner_id = ${ownerId} AND organization_id = ${organizationId};
  `;
  return res as Task[];
}

async function addTask(name: string, description: string, department: string, assignedTo: string, severity: number, ownerId: string, organizationId: string, userId: string): Promise<Task> {
    const res = await sql`
        INSERT INTO tasks (name, description, department, assigned_to, severity, owner_id, organization_id, created_by_id, status) 
        VALUES (${name}, ${description}, ${department}, ${assignedTo}, ${severity}, ${ownerId}, ${organizationId}, ${userId}, 'To Do') RETURNING *;
    `;
    return res[0] as Task;
}

async function setTaskState(taskId: number, status: string, ownerId: string, organizationId: string, userId: string) {
    await sql`
        UPDATE tasks 
        SET status = ${status}, updated_by_id = ${userId}, updated_on = NOW() 
        WHERE id = ${taskId} AND owner_id = ${ownerId} AND organization_id = ${organizationId};
    `;
}

async function updateTask(taskId: number, name: string, description: string, department: string, assignedTo: string, severity: number, ownerId: string, organizationId: string, userId: string) {
  await sql`
    UPDATE tasks 
    SET name = ${name}, description = ${description}, department = ${department}, assigned_to = ${assignedTo}, severity = ${severity}, updated_by_id = ${userId}, updated_on = NOW() 
    WHERE id = ${taskId} AND owner_id = ${ownerId} AND organization_id = ${organizationId};
  `;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`form-input rounded-lg bg-gray-200 text-black ${props.className}`} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`form-textarea rounded-lg bg-gray-200 text-black ${props.className}`} />;
}

function Button({ variant, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  const baseClass = 'py-2 px-4 rounded bg-blue-500 text-white';
  return <button {...props} className={`${baseClass} ${className}`} />;
}

function Label({ htmlFor, children }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-white">
      {children}
    </label>
  );
}

function Dialog({ children }: { children: React.ReactNode }) {
  return <div className="dialog">{children}</div>;
}

function DialogTrigger({  children }: { asChild?: boolean; children: React.ReactElement }) {
  return React.cloneElement(children, { onClick: () => console.log('Open dialog') });
}

function DialogContent({ children }: { children: React.ReactNode }) {
  return <div className="dialog-content">{children}</div>;
}

function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="dialog-header">{children}</div>;
}

function AddTaskForm({ ownerId, organizationId, userId, disabled, onTaskAdded, organizationMembers, onOrgIdChange }: { ownerId: string; organizationId: string; userId: string; disabled: boolean; onTaskAdded: (task: Task) => void; organizationMembers: any[], onOrgIdChange: (orgId: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [severity, setSeverity] = useState<number>(1);
  const [orgId, setOrgId] = useState<string>(organizationId);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    try {
      const newTask = await addTask(name, description, department, assignedTo, severity, ownerId, orgId, userId);
      setName('');
      setDescription('');
      setDepartment('');
      setAssignedTo('');
      setSeverity(1);
      onTaskAdded(newTask);
      setMessage('Task created successfully!');
    } catch (error) {
      console.error("Error adding task:", error);
      setMessage('Error creating task. Please try again.');
    }
  }

  const handleOrgIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOrgId = e.target.value;
    setOrgId(newOrgId);
    onOrgIdChange(newOrgId);
  }

  return (
    <div className="neon-glass">
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <Input
          autoFocus
          type="text"
          name="name"
          placeholder="Task name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="disabled:cursor-not-allowed"
          disabled={disabled}
        />
        <Textarea
          name="description"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="disabled:cursor-not-allowed"
          disabled={disabled}
        />
        <Input
          type="text"
          name="department"
          placeholder="Department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="disabled:cursor-not-allowed"
          disabled={disabled}
        />
        <Input
          type="text"
          name="organizationId"
          placeholder="Organization ID"
          value={orgId}
          onChange={handleOrgIdChange}
          className="disabled:cursor-not-allowed"
          disabled={disabled}
        />
        <select
          name="assignedTo"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="form-select rounded-lg bg-gray-200 text-black disabled:cursor-not-allowed"
          disabled={disabled}
        >
          <option value="">Select a member</option>
          <option value={userId}>Assign to me</option>
          {organizationMembers.map(member => (
            <option key={member.publicUserData.userId} value={member.publicUserData.userId}>{member.publicUserData.firstName} {member.publicUserData.lastName}</option>
          ))}
        </select>
        <Input
          type="number"
          name="severity"
          placeholder="Severity (1-4)"
          value={severity}
          onChange={(e) => setSeverity(Number(e.target.value))}
          min={1}
          max={4}
          className="disabled:cursor-not-allowed"
          disabled={disabled}
        />
        <Button type="submit" className="disabled:cursor-not-allowed" disabled={disabled}>
          Add
        </Button>
      </form>
      {message && <p className="mt-2">{message}</p>}
    </div>
  );
}

function TaskRow({ task, disabled, organizationMembers, userId, onTaskCompleted }: { task: Task; disabled: boolean; organizationMembers: any[]; userId: string; onTaskCompleted: () => void }) {
  const [isDone, setIsDone] = useState(task.status === 'Done');
  const [showConfetti, setShowConfetti] = useState(false);

  async function onCheckClicked() {
    const newStatus = !isDone ? 'Done' : 'To Do';
    await setTaskState(task.id, newStatus, task.owner_id, task.organization_id, userId);
    setIsDone(!isDone);
    if (!isDone) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000); // Show confetti for 3 seconds
      onTaskCompleted();
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const department = formData.get('department') as string;
    const assignedTo = formData.get('assignedTo') as string;
    const severity = Number(formData.get('severity'));
    const userId = task.owner_id;
    await updateTask(task.id, name, description, department, assignedTo, severity, task.owner_id, task.organization_id, userId);
    window.location.reload();
  }

  return (
    <>
      {showConfetti && <Confetti />}
      <motion.div
        whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(0, 128, 255, 1)" }}
        className={`group flex flex-col items-center justify-between transition-all w-full bg-white p-3 mb-2 rounded shadow-md neon-glass hover:neon-glow`}
      >
        <div className="flex items-center justify-between w-full">
          <Button
            variant="link"
            className="text-lg text-white-500 disabled:cursor-not-allowed"
            disabled={disabled}
            onClick={onCheckClicked}
          >
            {isDone ? <FiCheckCircle /> : <FiCircle />}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="link" className={`flex-1 justify-start text-white-500 ${isDone && 'line-through'}`}>
                {task.name}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>Edit task</DialogHeader>
              <form onSubmit={onSubmit} className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input type="text" name="name" defaultValue={task.name} disabled={disabled} />
                <Label htmlFor="description">Description</Label>
                <Textarea name="description" defaultValue={task.description} disabled={disabled} />
                <Label htmlFor="department">Department</Label>
                <Input type="text" name="department" defaultValue={task.department} disabled={disabled} />
                <Label htmlFor="assignedTo">Assigned to</Label>
                <select
                  name="assignedTo"
                  defaultValue={task.assignedTo}
                  className="form-select rounded-lg bg-gray-200 text-black disabled:cursor-not-allowed"
                  disabled={disabled}
                >
                  <option value="">Select a member</option>
                  <option value={userId}>Assign to me</option>
                  {organizationMembers.map(member => (
                    <option key={member.publicUserData.userId} value={member.publicUserData.userId}>{member.publicUserData.firstName} {member.publicUserData.lastName}</option>
                  ))}
                </select>
                <Label htmlFor="severity">Severity</Label>
                <Input type="number" name="severity" defaultValue={task.severity} min={1} max={4} disabled={disabled} />
                <Button type="submit" disabled={disabled}>
                  Save
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>
    </>
  );
}

const TasksPage = () => {
  const { user } = useUser();
  const { organization } = useOrganization();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [organizationMembers, setOrganizationMembers] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<{ userId: string; ownerId: string; organizationId: string; canEdit: boolean } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/signin');
      return;
    }

    async function fetchUserInfo() {
      if (user) {
        const userId = user.id;
        const orgId = organization ? organization.id : userId;
        const canEdit = true;

        setUserInfo({
          userId,
          ownerId: userId,
          organizationId: orgId,
          canEdit,
        });

        const fetchedTasks = await getTasks(userId, orgId);
        setTasks(fetchedTasks);

        const token = user;
        const membersRes = await axios.get(`https://api.clerk.dev/v1/organizations/${orgId}/memberships`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setOrganizationMembers(membersRes.data);
      }
    }

    fetchUserInfo();
  }, [user, organization, router]);

  const onTaskAdded = (newTask: Task) => {
    setTasks((prevTasks) => [...prevTasks, newTask]);
  };

  const onOrgIdChange = async (orgId: string) => {
    const token = user;
    const membersRes = await axios.get(`https://api.clerk.dev/v1/organizations/${orgId}/memberships`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setOrganizationMembers(membersRes.data);
  }

  const onTaskCompleted = () => {
    // Additional logic to handle task completion (e.g., updating progress bar)
  }

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    const { source, destination } = result;
    const updatedTasks = Array.from(tasks);
    const [movedTask] = updatedTasks.splice(source.index, 1);
    movedTask.status = destination.droppableId;
    updatedTasks.splice(destination.index, 0, movedTask);
    setTasks(updatedTasks);
    const userId = user?.id;
    if (userId) {
      await setTaskState(movedTask.id, movedTask.status, movedTask.owner_id, movedTask.organization_id, userId);
    }
  };

  const completedTasksCount = tasks.filter(task => task.status === 'Done').length;
  const totalTasksCount = tasks.length;
  const progressPercentage = totalTasksCount === 0 ? 0 : (completedTasksCount / totalTasksCount) * 100;

  if (!user) {
    return null;
  }

  if (!userInfo) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center p-5">
      <Head>
        <title>Task Page</title>
      </Head>
      <nav className="flex p-2 justify-between items-center bg-slate-100 border-b border-slate-200 w-full neon-glass">
        <div className="flex items-center gap-2">
          <div>Task Management</div>
        </div>
        <SignedIn>
          <div className="flex items-center gap-2">
            <OrganizationSwitcher />
            <UserButton />
          </div>
        </SignedIn>
        <SignedOut>
          <Link href="/signin">Sign in</Link>
        </SignedOut>
      </nav>
      <div className="w-full bg-white rounded-lg shadow-md p-4 mb-4 neon-glass">
        <h2 className="text-lg font-semibold mb-2">Task Progress</h2>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
          <div className="bg-blue-500 h-4 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
        </div>
        <p>{completedTasksCount} of {totalTasksCount} tasks completed</p>
      </div>
      <AddTaskForm
        ownerId={userInfo.ownerId}
        organizationId={userInfo.organizationId}
        userId={userInfo.userId}
        disabled={!userInfo.canEdit}
        onTaskAdded={onTaskAdded}
        organizationMembers={organizationMembers}
        onOrgIdChange={onOrgIdChange}
      />
      <div className="flex gap-2 p-2 w-full">
        <DragDropContext onDragEnd={onDragEnd}>
          {['To Do', 'In Progress', 'Done'].map((status) => (
            <Droppable key={status} droppableId={status}>
                {(provided: any) => (
                <div className="w-1/3 bg-white p-3 rounded shadow-md mb-5 neon-glass" ref={provided.innerRef} {...provided.droppableProps}>
                  <h2>{status}</h2>
                  {tasks.filter((task) => task.status === status).map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                        {(provided: any) => (
                        <motion.div
                            whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(0, 128, 255, 1)" }}
                            className="bg-white p-3 mb-2 rounded shadow-md neon-glass hover:neon-glow"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onDragStart={(event, info) => {
                                // Handle drag start event
                            }}
                        >
                          <TaskRow
                            key={task.id}
                            task={task}
                            disabled={!userInfo.canEdit}
                            organizationMembers={organizationMembers}
                            userId={userInfo.userId}
                            onTaskCompleted={onTaskCompleted}
                          />
                        </motion.div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </DragDropContext>
      </div>
      <style jsx>{`
        .neon-glass {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 0 15px rgba(0, 128, 255, 0.5);
        }
        .neon-glow {
          box-shadow: 0 0 10px rgba(0, 128, 255, 0.6), 0 0 20px rgba(0, 128, 255, 0.6), 0 0 30px rgba(0, 128, 255, 0.6);
        }
      `}</style>
    </div>
  );
};


export default TasksPage;
